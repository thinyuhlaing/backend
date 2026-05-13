import { Controller } from '@nestjs/common';
import { AbstractBaseController } from '../common/base/base.controller';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@Controller('payment_methods')
export class PaymentMethodsController extends AbstractBaseController<
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto
> {
  constructor(private readonly paymentMethodService: PaymentMethodsService) {
    super(paymentMethodService);
  }
}
