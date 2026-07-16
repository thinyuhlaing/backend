import { Transform } from 'class-transformer';
import { IsString, Matches, MinLength } from 'class-validator';

const GMAIL_LOGIN_PATTERN = /^[A-Za-z0-9._%+-]+@gmail\.com$/;

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(GMAIL_LOGIN_PATTERN, {
    message: 'login must be a valid Gmail address ending in @gmail.com',
  })
  login: string;

  @IsString()
  @MinLength(6)
  password: string;
}
