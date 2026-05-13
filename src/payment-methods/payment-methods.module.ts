import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsRepository } from './payment-methods.repository';

@Module({
  imports: [DatabaseModule],
  providers: [PaymentMethodsRepository, PaymentMethodsService],
  controllers: [PaymentMethodsController],
})
export class PaymentMethodsModule {}
