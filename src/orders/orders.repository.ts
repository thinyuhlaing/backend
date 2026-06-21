import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { user_profiles } from '../users/schema/user_profiles.schema';
import { users } from '../users/schema/users.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './interfaces/order.interface';
import { orders } from './schema/orders.schema';

@Injectable()
export class OrdersRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) {}

  async create(dto: CreateOrderDto) {
    const [order] = await this.db
      .insert(orders)
      .values({
        orderNumber: dto.orderNumber,
        customerId: dto.customerId,
        orderDate: dto.orderDate,
        total: dto.total.toString(),
        status: dto.status,
      })
      .returning();

    return this.map(order);
  }

  async findAll() {
    const rows = await this.db
      .select({
        order: orders,
        customer: users,
        profile: user_profiles,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.customerId))
      .leftJoin(user_profiles, eq(user_profiles.userId, users.id))
      .where(eq(orders.isArchived, false))
      .orderBy(desc(orders.id));

    return rows.map((row) => this.mapJoinedRow(row));
  }

  async findOne(id: number) {
    const [order] = await this.db
      .select({
        order: orders,
        customer: users,
        profile: user_profiles,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.customerId))
      .leftJoin(user_profiles, eq(user_profiles.userId, users.id))
      .where(and(eq(orders.id, id), eq(orders.isArchived, false)));

    return order ? this.mapJoinedRow(order) : null;
  }

  async update(id: number, dto: UpdateOrderDto) {
    const values: {
      orderNumber?: string;
      customerId?: number;
      orderDate?: string;
      total?: string;
      status?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (dto.orderNumber !== undefined) values.orderNumber = dto.orderNumber;
    if (dto.customerId !== undefined) values.customerId = dto.customerId;
    if (dto.orderDate !== undefined) values.orderDate = dto.orderDate;
    if (dto.total !== undefined) values.total = dto.total.toString();
    if (dto.status !== undefined) values.status = dto.status;

    const [order] = await this.db
      .update(orders)
      .set(values)
      .where(eq(orders.id, id))
      .returning();

    return order ? this.findOne(order.id) : null;
  }

  async remove(id: number) {
    const [order] = await this.db
      .update(orders)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    return !!order;
  }

  private map(row: typeof orders.$inferSelect): Order {
    return {
      ...row,
      total: Number(row.total),
    };
  }

  private mapJoinedRow(row: {
    order: typeof orders.$inferSelect;
    customer: typeof users.$inferSelect;
    profile: typeof user_profiles.$inferSelect | null;
  }): Order {
    return {
      ...this.map(row.order),
      customerName: row.profile?.name ?? null,
      customerLogin: row.customer.login,
    };
  }
}
