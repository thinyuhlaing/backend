import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

const toOptionalParentId = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  return Number(value);
};

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Transform(toOptionalParentId)
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
