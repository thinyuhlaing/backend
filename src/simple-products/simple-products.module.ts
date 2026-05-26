import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SimpleProductsController } from './simple-products.controller';
import { SimpleProductsRepository } from './simple-products.repository';
import { SimpleProductsService } from './simple-products.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SimpleProductsController],
  providers: [SimpleProductsRepository, SimpleProductsService],
})
export class SimpleProductsModule {}
