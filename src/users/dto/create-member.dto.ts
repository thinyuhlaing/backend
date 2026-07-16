import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';

const GMAIL_LOGIN_PATTERN = /^[A-Za-z0-9._%+-]+@gmail\.com$/;

export class CreateMemberDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(GMAIL_LOGIN_PATTERN, {
    message: 'login must be a valid Gmail address ending in @gmail.com',
  })
  login?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(GMAIL_LOGIN_PATTERN, {
    message: 'email must be a valid Gmail address ending in @gmail.com',
  })
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  @IsOptional()
  @IsIn(['Active', 'Inactive'])
  status?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  walletAmount?: number;

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vipLevel?: number;
}
