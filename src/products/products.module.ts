import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';

import { ProductsController } from './products.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
