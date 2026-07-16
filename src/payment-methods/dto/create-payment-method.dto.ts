import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const PAYMENT_TYPE_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export class CreatePaymentMethodDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(PAYMENT_TYPE_CODE_PATTERN, {
    message: 'code must use lowercase letters, numbers, hyphens, or underscores',
  })
  code!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
