import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, Reflector],
  exports: [AuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
