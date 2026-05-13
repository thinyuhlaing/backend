import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from 'src/users/interfaces/user.interface';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    const token = this.extractBearerToken(request);

    request.user = await this.authService.getAuthenticatedUser(token);

    return true;
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Authentication required');
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authentication required');
    }

    return token;
  }
}
