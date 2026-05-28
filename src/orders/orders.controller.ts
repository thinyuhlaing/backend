import { Controller } from '@nestjs/common';
import { AbstractBaseController } from '../common/base/base.controller';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController extends AbstractBaseController<
  CreateOrderDto,
  UpdateOrderDto
> {
  constructor(private readonly ordersService: OrdersService) {
    super(ordersService);
  }
}
