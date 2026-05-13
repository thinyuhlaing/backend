import { Injectable } from '@nestjs/common';
import { AbstractBaseService } from '../common/base/base.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './interfaces/product-category.interface';
import { ProductCategoriesRepository } from './product-categories.repository';

@Injectable()
export class ProductCategoriesService extends AbstractBaseService<
  ProductCategory,
  CreateProductCategoryDto,
  UpdateProductCategoryDto
> {
  constructor(productCategoryRepository: ProductCategoriesRepository) {
    super(productCategoryRepository);
  }
}
