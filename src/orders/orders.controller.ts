import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { UserRole } from 'src/users/enums/user-role.enum';
import type { User } from 'src/users/interfaces/user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrdersService } from './orders.service';

@Controller(['order', 'orders'])
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
  ) {
    const user = await this.getOptionalUser(req);
    const customerId = this.resolveCustomerId(dto.customerId, user);

    return this.ordersService.create({
      ...dto,
      customerId,
    });
  }

  // Admin: view all orders
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  // Public no-auth read. Pass customerId to filter portal-user order history.
  @Get('my')
  findMine(@Query('customerId') customerId?: string) {
    const parsedCustomerId = Number(customerId);

    if (Number.isInteger(parsedCustomerId) && parsedCustomerId > 0) {
      return this.ordersService.findByCustomer(parsedCustomerId);
    }

    return this.ordersService.findAll();
  }

  @Get('my/:id')
  findMyOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Get('wallet-history')
  async findWalletHistory(@Req() req: Request) {
    const user = await this.getRequiredUser(req);
    return this.ordersService.findWalletHistoryByCustomer(user.id);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  // Admin: update order
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  // Admin: remove (archive) order
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }

  private async getOptionalUser(req: Request): Promise<User | null> {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.authService.getAuthenticatedUser(token);
  }

  private async getRequiredUser(req: Request): Promise<User> {
    const user = await this.getOptionalUser(req);

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }

  private resolveCustomerId(
    customerId: number | undefined,
    user: User | null,
  ) {
    if (!customerId) {
      return undefined;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.userRole === UserRole.INTERNAL_USER) {
      return customerId;
    }

    return user.id;
  }
}
