import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @Type(() => Number)
  @IsInt()
  customerId!: number;

  @IsDateString()
  orderDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total!: number;

  @IsString()
  @IsNotEmpty()
  status!: string;
}
