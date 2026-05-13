import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { AbstractBaseController } from '../common/base/base.controller';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController extends AbstractBaseController<
  CreateProductDto,
  UpdateProductDto
> {
  constructor(private readonly productService: ProductsService) {
    super(productService);
  }
}
