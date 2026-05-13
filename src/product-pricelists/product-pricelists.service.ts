import { Injectable } from '@nestjs/common';
import { AbstractBaseService } from '../common/base/base.service';
import { CreateProductPricelistDto } from './dto/create-product-pricelist.dto';
import { UpdateProductPricelistDto } from './dto/update-product-pricelist.dto';
import { ProductPricelist } from './interfaces/product-pricelists.interface';
import { ProductPricelistsRepository } from './product-pricelists.repository';

@Injectable()
export class ProductPricelistsService extends AbstractBaseService<
  ProductPricelist,
  CreateProductPricelistDto,
  UpdateProductPricelistDto
> {
  constructor(productPricelistsRepository: ProductPricelistsRepository) {
    super(productPricelistsRepository);
  }
}
