import { Controller } from '@nestjs/common';
import { AbstractBaseController } from '../common/base/base.controller';
import { CreateProductPricelistDto } from './dto/create-product-pricelist.dto';
import { UpdateProductPricelistDto } from './dto/update-product-pricelist.dto';
import { ProductPricelistsService } from './product-pricelists.service';

@Controller('product-pricelists')
export class ProductPricelistsController extends AbstractBaseController<
  CreateProductPricelistDto,
  UpdateProductPricelistDto
> {
  constructor(
    private readonly productPricelistsService: ProductPricelistsService,
  ) {
    super(productPricelistsService);
  }
}
