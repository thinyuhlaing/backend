import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductPricelistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
