import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { User } from 'src/users/interfaces/user.interface';
import { verifyHashedSecret, verifyPassword } from 'src/users/password.util';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/login.dto';
import { EmailService } from './email.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type TokenType = 'access' | 'refresh';

interface JwtPayload {
  sub: number;
  role: UserRole;
  type: TokenType;
  exp: number;
  iat: number;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface PendingRegistrationResponse {
  success: true;
  requiresEmailVerification: true;
  message: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) { }

  async register(
    dto: CreateUserDto,
  ): Promise<AuthResponse | PendingRegistrationResponse> {
    await this.ensureLoginAvailable(dto.login);
    this.emailService.ensureSmtpConfigured();

    const emailVerificationToken = randomBytes(32).toString('hex');

    await this.usersService.create({
      ...dto,
      emailVerificationToken: this.hashEmailVerificationToken(
        emailVerificationToken,
      ),
    });

    await this.emailService.sendVerificationEmail({
      to: dto.login,
      name: dto.name,
      verificationUrl: this.buildVerificationUrl(dto, emailVerificationToken),
    });

    return {
      success: true,
      requiresEmailVerification: true,
      message: 'Please verify your email address to activate your account.',
    };
  }

  async verifyEmail(token?: string): Promise<AuthResponse> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.usersService.findByVerificationTokenHash(
      this.hashEmailVerificationToken(token),
    );

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('Verification token has expired');
    }

    const verifiedUser = await this.usersService.markEmailVerified(user.id);
    const tokens = await this.issueTokens(verifiedUser);

    return {
      ...tokens,
      user: verifiedUser,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateCredentials(dto.login, dto.password);
    const safeUser = this.usersService.sanitizeUser(user);
    const tokens = await this.issueTokens(safeUser);

    return {
      ...tokens,
      user: safeUser,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponse> {
    const payload = this.verifyToken(dto.refreshToken, 'refresh');
    const user = await this.usersService.findByIdWithPassword(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (this.isInactiveUser(user.status)) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (!verifyHashedSecret(dto.refreshToken, user.refreshTokenHash)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const safeUser = this.usersService.sanitizeUser(user);
    const tokens = await this.issueTokens(safeUser);

    return {
      ...tokens,
      user: safeUser,
    };
  }

  async logout(userId: number): Promise<{ success: true }> {
    await this.usersService.clearRefreshToken(userId);
    return { success: true };
  }

  async getAuthenticatedUser(token: string): Promise<User> {
    const payload = this.verifyToken(token, 'access');
    const user = await this.usersService.findByIdWithPassword(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (this.isInactiveUser(user.status)) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.usersService.sanitizeUser(user);
  }

  verifyToken(token: string, expectedType: TokenType): JwtPayload {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as JwtPayload;

    if (!Number.isInteger(payload.sub)) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    const expectedSignature = this.sign(unsignedToken, payload.type);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    if (payload.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('Authentication token expired');
    }

    if (payload.type !== expectedType) {
      throw new UnauthorizedException('Invalid authentication token');
    }

    return payload;
  }

  private async ensureLoginAvailable(login: string): Promise<void> {
    const existingUser = await this.usersService.findByLogin(login);

    if (existingUser) {
      throw new ConflictException('Login already in use');
    }
  }

  private async validateCredentials(login: string, password: string) {
    const user = await this.usersService.findByLogin(login);

    if (!user || !verifyPassword(password, user.password)) {
      throw new UnauthorizedException('Invalid login or password');
    }

    if (this.isInactiveUser(user.status)) {
      throw new UnauthorizedException('Account is inactive');
    }

    if (!user.isVerified && !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    return user;
  }

  private isInactiveUser(status?: string | null): boolean {
    return status?.toLowerCase() === 'inactive';
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const tokens = this.generateTokens(user);
    await this.usersService.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private generateTokens(user: User): AuthTokens {
    return {
      accessToken: this.signToken(user, 'access'),
      refreshToken: this.signToken(user, 'refresh'),
    };
  }

  private signToken(user: User, tokenType: TokenType): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: JwtPayload = {
      sub: user.id,
      role: user.userRole,
      type: tokenType,
      iat: issuedAt,
      exp: issuedAt + this.getTokenTtl(tokenType),
    };

    const encodedHeader = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    return `${unsignedToken}.${this.sign(unsignedToken, tokenType)}`;
  }

  private sign(value: string, tokenType: TokenType = 'access'): string {
    return createHmac('sha256', this.getTokenSecret(tokenType))
      .update(value)
      .digest('base64url');
  }

  private hashEmailVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildVerificationUrl(dto: CreateUserDto, token: string): string {
    const baseUrl = this.configService.get<string>('FRONTEND_APP_URL') || 'http://localhost:3000';

    return `${baseUrl.replace(/\/$/, '')}/auth/verify-email?token=${token}`;
  }

  private getTokenTtl(tokenType: TokenType): number {
    if (tokenType === 'refresh') {
      return (
        this.configService.get<number>('AUTH_REFRESH_TOKEN_TTL_SECONDS') ??
        60 * 60 * 24 * 7
      );
    }

    return this.configService.get<number>('AUTH_TOKEN_TTL_SECONDS') ?? 60 * 60;
  }

  private getTokenSecret(tokenType: TokenType): string {
    if (tokenType === 'refresh') {
      return (
        this.configService.get<string>('AUTH_REFRESH_TOKEN_SECRET') ??
        'dev-refresh-secret'
      );
    }

    return (
      this.configService.get<string>('AUTH_TOKEN_SECRET') ?? 'dev-auth-secret'
    );
  }
}
