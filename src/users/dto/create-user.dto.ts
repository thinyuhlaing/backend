import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9._%+-]+@gmail\.com$/, {
    message: 'login must be a valid Gmail address ending in @gmail.com',
  })
  login!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  userRole!: UserRole;

  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

// DTO fields don’t get values immediately → TypeScript complains → ! tells TS to trust NestJS.
