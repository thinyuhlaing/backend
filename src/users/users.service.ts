import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hashPassword, hashSecret } from './password.util';
import { CreateMemberDto } from './dto/create-member.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import { Member, User, UserWithPassword } from './interfaces/user.interface';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) { }

  async create(dto: CreateUserDto): Promise<User> {
    await this.ensureUniqueLogin(dto.login);

    const user = await this.repository.create({
      ...dto,
      password: hashPassword(dto.password),
    });

    return this.sanitizeUser(user);
  }

  async findAll(opts?: { page?: number; limit?: number; q?: string }): Promise<User[]> {
    const users = await this.repository.findAll(opts);
    return users.map((user) => this.sanitizeUser(user));
  }

  async findMembers(opts?: { page?: number; limit?: number; q?: string }): Promise<Member[]> {
    const users = await this.repository.findMembers(opts);
    return users.map((user) => this.toMember(user));
  }

  async findMember(id: number): Promise<Member> {
    const user = await this.repository.findMember(id);
    if (!user) {
      throw new NotFoundException('Member not found');
    }

    return this.toMember(user);
  }

  async createMember(dto: CreateMemberDto): Promise<Member> {
    const login = dto.login ?? dto.email;

    if (!login) {
      throw new BadRequestException('Member email or login is required');
    }

    const user = await this.create({
      ...dto,
      login,
      userRole: dto.userRole ?? UserRole.PORTAL_USER,
    });

    return this.toMember(user);
  }

  async updateMember(id: number, dto: UpdateUserDto): Promise<Member> {
    const nextLogin = dto.login ?? dto.email;

    if (nextLogin !== undefined) {
      const currentMember = await this.repository.findMember(id);
      if (!currentMember) {
        throw new NotFoundException('Member not found');
      }

      await this.ensureUniqueLogin(nextLogin, currentMember.id);
    }

    const user = await this.repository.updateMember(id, {
      ...dto,
      login: nextLogin,
      password: dto.password ? hashPassword(dto.password) : undefined,
    });

    if (!user) {
      throw new NotFoundException('Member not found');
    }

    return this.toMember(user);
  }

  async removeMember(id: number) {
    const deleted = await this.repository.removeMember(id);
    if (!deleted) {
      throw new NotFoundException('Member not found');
    }

    return { deleted: true };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const nextLogin = dto.login ?? dto.email;

    if (nextLogin !== undefined) {
      await this.ensureUniqueLogin(nextLogin, id);
    }

    const user = await this.repository.update(id, {
      ...dto,
      login: nextLogin,
      password: dto.password ? hashPassword(dto.password) : undefined,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async remove(id: number) {
    const deleted = await this.repository.remove(id);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }

    return { deleted: true };
  }

  async findByLogin(login: string): Promise<UserWithPassword | null> {
    return this.repository.findByLogin(login);
  }

  async findByIdWithPassword(id: number): Promise<UserWithPassword | null> {
    return this.repository.findById(id);
  }

  async findByVerificationTokenHash(
    tokenHash: string,
  ): Promise<UserWithPassword | null> {
    return this.repository.findByVerificationTokenHash(tokenHash);
  }

  async markEmailVerified(id: number): Promise<User> {
    const user = await this.repository.markEmailVerified(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async storeRefreshToken(id: number, refreshToken: string): Promise<void> {
    await this.repository.updateRefreshTokenHash(id, hashSecret(refreshToken));
  }

  async clearRefreshToken(id: number): Promise<void> {
    await this.repository.updateRefreshTokenHash(id, null);
  }

  sanitizeUser(user: UserWithPassword): User {
    const {
      password: _password,
      refreshTokenHash: _refreshTokenHash,
      emailVerificationTokenHash: _emailVerificationTokenHash,
      emailVerificationTokenExpiresAt: _emailVerificationTokenExpiresAt,
      ...safeUser
    } = user;
    return safeUser;
  }

  private toMember(user: UserWithPassword | User): Member {
    const safeUser = 'password' in user ? this.sanitizeUser(user) : user;

    return {
      ...safeUser,
      id: safeUser.profileId ?? safeUser.id,
      userId: safeUser.id,
    };
  }

  private async ensureUniqueLogin(
    login: string,
    currentUserId?: number,
  ): Promise<void> {
    const existingUser = await this.repository.findByLogin(login);

    if (existingUser && existingUser.id !== currentUserId) {
      throw new ConflictException('Login already in use');
    }
  }
}
