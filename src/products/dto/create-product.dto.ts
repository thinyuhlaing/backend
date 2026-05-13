import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsNumber()
  categoryId!: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  image_url?: string | null;

  @Transform(({ obj }) => obj.imageUrl ?? obj.image_url)
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @Transform(({ obj }) => obj.salePrice ?? obj.price)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice!: number;

  @Transform(({ obj }) => obj.costPrice ?? obj.price)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
