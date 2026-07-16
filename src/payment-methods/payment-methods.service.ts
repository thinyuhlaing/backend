import { Injectable } from '@nestjs/common';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodsRepository } from './payment-methods.repository';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly paymentMethodRepository: PaymentMethodsRepository) {}

  create(dto: CreatePaymentMethodDto) {
    return this.paymentMethodRepository.create(dto);
  }

  findAll() {
    return this.paymentMethodRepository.findAll();
  }

  findOne(id: number) {
    return this.paymentMethodRepository.findOne(id);
  }

  update(id: number, dto: UpdatePaymentMethodDto) {
    return this.paymentMethodRepository.update(id, dto);
  }

  async remove(id: number) {
    await this.paymentMethodRepository.remove(id);
    return { deleted: true };
  }

  findActiveByCode(code: string) {
    return this.paymentMethodRepository.findActiveByCode(code);
  }
}
