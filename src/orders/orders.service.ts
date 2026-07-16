import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  create(dto: CreateOrderDto) {
    return this.ordersRepository.create(dto);
  }

  findAll() {
    return this.ordersRepository.findAll();
  }

  findByCustomer(customerId: number) {
    return this.ordersRepository.findByCustomer(customerId);
  }

  findWalletHistoryByCustomer(customerId: number) {
    return this.ordersRepository.findWalletHistoryByCustomer(customerId);
  }

  async findOne(id: number, customerId?: number) {
    const order = await this.ordersRepository.findOne(id, customerId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  update(id: number, dto: UpdateOrderDto) {
    return this.ordersRepository.update(id, dto);
  }

  async remove(id: number) {
    await this.ordersRepository.remove(id);
    return { deleted: true };
  }
}
