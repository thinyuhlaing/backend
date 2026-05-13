import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProductCategoriesRepository } from './product-categories.repository';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesController } from './product-categories.controller';

@Module({
  imports: [DatabaseModule],
  providers: [ProductCategoriesRepository, ProductCategoriesService],
  controllers: [ProductCategoriesController],
})
export class ProductCategoriesModule {}
