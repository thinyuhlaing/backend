import { Controller } from '@nestjs/common';
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
}
