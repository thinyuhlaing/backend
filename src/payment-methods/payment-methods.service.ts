import { Injectable } from '@nestjs/common';
import { AbstractBaseService } from '../common/base/base.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethod } from './interfaces/payment-method.interface';
import { PaymentMethodsRepository } from './payment-methods.repository';

@Injectable()
export class PaymentMethodsService extends AbstractBaseService<
  PaymentMethod,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto
> {
  constructor(paymentMethodRepository: PaymentMethodsRepository) {
    super(paymentMethodRepository);
  }
}
