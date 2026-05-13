import { Module } from '@nestjs/common';
import { DeliveryMethodsService } from './delivery-methods.service';
import { DeliveryMethodsController } from './delivery-methods.controller';
import { DeliveryMethodsRepository } from './delivery-methods.repository';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DeliveryMethodsRepository, DeliveryMethodsService],
  controllers: [DeliveryMethodsController]
})
export class DeliveryMethodsModule { }
