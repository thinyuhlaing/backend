import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9._%+-]+@gmail\.com$/, {
    message: 'login must be a valid Gmail address ending in @gmail.com',
  })
  login: string;

  @IsString()
  @MinLength(6)
  password: string;
}
