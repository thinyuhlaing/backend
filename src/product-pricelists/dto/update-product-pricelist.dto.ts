import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProductPricelistDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
