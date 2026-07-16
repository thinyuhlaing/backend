import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { AbstractBaseController } from '../common/base/base.controller';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoriesService } from './product-categories.service';

@Controller('product-categories')
export class ProductCategoriesController extends AbstractBaseController<
  CreateProductCategoryDto,
  UpdateProductCategoryDto
> {
  constructor(
    private readonly productCategoryService: ProductCategoriesService,
  ) {
    super(productCategoryService);
  }

  @Post()
  create(@Body() dto: CreateProductCategoryDto) {
    return this.productCategoryService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productCategoryService.update(id, dto);
  }
}
