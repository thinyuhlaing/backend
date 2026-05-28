import { Injectable } from '@nestjs/common';
import { AbstractBaseService } from '../common/base/base.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './interfaces/order.interface';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService extends AbstractBaseService<
  Order,
  CreateOrderDto,
  UpdateOrderDto
> {
  constructor(ordersRepository: OrdersRepository) {
    super(ordersRepository);
  }
}
