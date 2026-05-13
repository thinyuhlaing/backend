import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductPricelistsRepository } from './product-pricelists.repository';
import { ProductPricelistsService } from './product-pricelists.service';
import { ProductPricelistsController } from './product-pricelists.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ProductPricelistsRepository, ProductPricelistsService],
  controllers: [ProductPricelistsController],
})
export class ProductPricelistsModule {}
