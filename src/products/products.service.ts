import { Injectable } from '@nestjs/common';
import { AbstractBaseService } from '../common/base/base.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './interfaces/product.interface';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService extends AbstractBaseService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(private readonly productRepository: ProductsRepository) {
    super(productRepository);
  }
}
