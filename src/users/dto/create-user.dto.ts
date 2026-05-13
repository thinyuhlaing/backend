import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  login: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  userRole: UserRole;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
