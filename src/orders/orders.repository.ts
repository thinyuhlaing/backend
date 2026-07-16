import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NodePgTransaction } from 'drizzle-orm/node-postgres/session';
import type { TablesRelationalConfig } from 'drizzle-orm/relations';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { paymentMethods } from '../payment-methods/schema/payment-methods.schema';
import { products } from '../products/schema/products.schema';
import { profiles } from '../users/schema/profiles.schema';
import { users } from '../users/schema/users.schema';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  Order,
  OrderItem,
  OrderStatus,
  WalletHistoryRecord,
} from './interfaces/order.interface';
import { orderItems, orders, walletHistory } from './schema/orders.schema';

type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;
type OrderTransaction = NodePgTransaction<
  Record<string, never>,
  TablesRelationalConfig
>;

type OrderHeaderRow = {
  order: OrderRow;
  customerId: number | null;
  customerLogin: string | null;
  profileName: string | null;
  profileEmail: string | null;
};

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Delivered',
  'Cancelled',
];

@Injectable()
export class OrdersRepository {
  private schemaReady?: Promise<void>;

  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) { }

  async create(dto: CreateOrderDto) {
    await this.ensureOrderSchema();

    const customerId = dto.customerId ?? null;
    const customerName = dto.customerName?.trim() || null;
    const customerEmail = dto.customerEmail?.trim() || null;

    if (customerId) {
      const customer = await this.findCustomer(customerId);
      if (!customer) {
        throw new BadRequestException('Customer does not exist');
      }
    } else if (!customerName || !customerEmail) {
      throw new BadRequestException(
        'customerName and customerEmail are required for guest orders',
      );
    }

    const preparedItems = await this.prepareItems(dto.items);
    const subtotal = preparedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingAmount = this.normalizeShippingAmount(dto.shippingAmount);
    const total = subtotal + shippingAmount;
    const orderDate = dto.orderDate ?? new Date().toISOString().slice(0, 10);
    const status = dto.status ?? 'Pending';
    const paymentType = await this.normalizePaymentType(dto.paymentType);

    this.validateStatus(status);

    const order = await this.db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber: dto.orderNumber ?? this.generateOrderNumber(),
          customerId,
          customerName,
          customerEmail,
          orderDate,
          shippingAddress: dto.shippingAddress ?? null,
          contactPhone: dto.contactPhone ?? null,
          paymentType,
          notes: dto.notes ?? null,
          shippingAmount: shippingAmount.toFixed(2),
          total: total.toFixed(2),
          status,
        })
        .returning();

      await tx.insert(orderItems).values(
        preparedItems.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          productPrice: item.productPrice.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
        })),
      );

      if (customerId && status === 'Confirmed') {
        await this.deductWalletForOrder(
          tx,
          createdOrder.id,
          createdOrder.orderNumber,
          customerId,
          this.calculateWalletHoldTotal(preparedItems, dto.notes),
        );
      }

      if (customerId && status === 'Delivered') {
        await this.deductWalletForOrder(
          tx,
          createdOrder.id,
          createdOrder.orderNumber,
          customerId,
          this.calculateWalletHoldTotal(preparedItems, dto.notes),
        );
        await this.creditWalletForOrder(
          tx,
          createdOrder.id,
          createdOrder.orderNumber,
          customerId,
          total,
        );
      }

      return createdOrder;
    });

    return this.findOne(order.id);
  }

  async findAll() {
    await this.ensureOrderSchema();

    const rows = await this.findOrderHeaders();
    return this.attachItems(rows);
  }

  async findByCustomer(customerId: number) {
    await this.ensureOrderSchema();

    const rows = await this.findOrderHeaders(eq(orders.customerId, customerId));
    return this.attachItems(rows);
  }

  async findWalletHistoryByCustomer(
    customerId: number,
  ): Promise<WalletHistoryRecord[]> {
    await this.ensureOrderSchema();

    const rows = await this.db
      .select({
        history: walletHistory,
        orderNumber: orders.orderNumber,
      })
      .from(walletHistory)
      .leftJoin(orders, eq(orders.id, walletHistory.orderId))
      .where(
        and(
          eq(walletHistory.userId, customerId),
          eq(walletHistory.isArchived, false),
        ),
      )
      .orderBy(desc(walletHistory.createdAt));

    return rows.map((row) => this.mapWalletHistory(row));
  }

  async findOne(id: number, customerId?: number) {
    await this.ensureOrderSchema();

    const filters = [eq(orders.id, id), eq(orders.isArchived, false)];

    if (customerId) {
      filters.push(eq(orders.customerId, customerId));
    }

    const [row] = await this.db
      .select({
        order: orders,
        customerId: users.id,
        customerLogin: users.login,
        profileName: profiles.name,
        profileEmail: profiles.email,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.customerId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(and(...filters));

    if (!row) {
      return null;
    }

    const [order] = await this.attachItems([row]);
    return order;
  }

  async update(id: number, dto: UpdateOrderDto) {
    await this.ensureOrderSchema();

    const existing = await this.findOne(id);
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    if (dto.customerId !== undefined) {
      const customer = await this.findCustomer(dto.customerId);
      if (!customer) {
        throw new BadRequestException('Customer does not exist');
      }
    }

    await this.db.transaction(async (tx) => {
      const values: {
        orderNumber?: string;
        customerId?: number | null;
        customerName?: string | null;
        customerEmail?: string | null;
        orderDate?: string;
        total?: string;
        status?: string;
        shippingAddress?: string | null;
        contactPhone?: string | null;
        paymentType?: string | null;
        notes?: string | null;
        shippingAmount?: string;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };
      let preparedItemsForWallet: Array<{ subtotal: number }> | undefined;

      if (dto.orderNumber !== undefined) values.orderNumber = dto.orderNumber;
      if (dto.customerId !== undefined) values.customerId = dto.customerId;
      if (dto.customerName !== undefined) {
        values.customerName = dto.customerName?.trim() || null;
      }
      if (dto.customerEmail !== undefined) {
        values.customerEmail = dto.customerEmail?.trim() || null;
      }
      if (dto.orderDate !== undefined) values.orderDate = dto.orderDate;
      if (dto.shippingAddress !== undefined) values.shippingAddress = dto.shippingAddress;
      if (dto.contactPhone !== undefined) values.contactPhone = dto.contactPhone;
      if (dto.paymentType !== undefined) {
        values.paymentType = await this.normalizePaymentType(dto.paymentType);
      }
      if (dto.notes !== undefined) values.notes = dto.notes;
      if (dto.shippingAmount !== undefined) {
        const shippingAmount = this.normalizeShippingAmount(
          dto.shippingAmount,
        );
        values.shippingAmount = shippingAmount.toFixed(2);
        values.total = (Number(existing.subtotal ?? 0) + shippingAmount).toFixed(2);
      }
      if (dto.status !== undefined) {
        this.validateStatus(dto.status);
        values.status = dto.status;
      }

      if (dto.items !== undefined) {
        const preparedItems = await this.prepareItems(
          this.preserveExistingItemPrices(dto.items, existing.items),
        );
        preparedItemsForWallet = preparedItems;
        const subtotal = preparedItems.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        const shippingAmount =
          dto.shippingAmount !== undefined
            ? this.normalizeShippingAmount(dto.shippingAmount)
            : Number(existing.shippingAmount ?? 0);
        const total = subtotal + shippingAmount;
        values.shippingAmount = shippingAmount.toFixed(2);
        values.total = total.toFixed(2);

        await tx.delete(orderItems).where(eq(orderItems.orderId, id));
        await tx.insert(orderItems).values(
          preparedItems.map((item) => ({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            productPrice: item.productPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
          })),
        );
      }

      await tx.update(orders).set(values).where(eq(orders.id, id));

      if (
        (dto.status === 'Confirmed' || dto.status === 'Delivered') &&
        existing.customerId &&
        !existing.walletDeducted
      ) {
        const deductionTotal =
          preparedItemsForWallet !== undefined
            ? this.calculateWalletHoldTotal(
                preparedItemsForWallet,
                values.notes ?? existing.notes,
              )
            : this.calculateWalletHoldTotalFromOrder(
                existing,
                values.notes ?? existing.notes,
              );
        await this.deductWalletForOrder(
          tx,
          id,
          existing.orderNumber,
          existing.customerId,
          deductionTotal,
        );
      }

      if (
        dto.status === 'Delivered' &&
        existing.customerId &&
        !existing.walletCredited
      ) {
        const creditTotal = Number(values.total ?? existing.total);
        await this.creditWalletForOrder(
          tx,
          id,
          existing.orderNumber,
          existing.customerId,
          creditTotal,
        );
      }
    });

    return this.findOne(id);
  }

  async remove(id: number) {
    await this.ensureOrderSchema();

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

  private async findOrderHeaders(extraFilter?: ReturnType<typeof eq>) {
    const filters = [eq(orders.isArchived, false)];
    if (extraFilter) {
      filters.push(extraFilter);
    }

    return this.db
      .select({
        order: orders,
        customerId: users.id,
        customerLogin: users.login,
        profileName: profiles.name,
        profileEmail: profiles.email,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.customerId))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(and(...filters))
      .orderBy(desc(orders.id));
  }

  private async ensureOrderSchema() {
    this.schemaReady ??= this.applyOrderSchemaPatch();
    return this.schemaReady;
  }

  private async applyOrderSchemaPatch() {
    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_by" integer,
        "updated_by" integer,
        "is_archived" boolean DEFAULT false NOT NULL,
        "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
        "product_id" integer NOT NULL REFERENCES "products"("id"),
        "quantity" integer NOT NULL,
        "product_price" numeric(10, 2) NOT NULL,
        "subtotal" numeric(10, 2) NOT NULL
      )
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ALTER COLUMN "customer_id" DROP NOT NULL
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_name" varchar(255)
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_email" varchar(255)
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_address" varchar(1000)
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "contact_phone" varchar(50)
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_type" varchar(100)
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "notes" varchar(1000)
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_amount" numeric(10, 2) DEFAULT 0 NOT NULL
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "wallet_deducted" boolean DEFAULT false NOT NULL
    `);

    await this.db.execute(sql`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "wallet_credited" boolean DEFAULT false NOT NULL
    `);

    await this.db.execute(sql`
      CREATE TABLE IF NOT EXISTS "wallet_history" (
        "id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_by" integer,
        "updated_by" integer,
        "is_archived" boolean DEFAULT false NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
        "order_id" integer REFERENCES "orders"("id") ON DELETE set null,
        "type" varchar(20) NOT NULL,
        "amount" numeric(12, 2) NOT NULL,
        "balance_before" numeric(12, 2) NOT NULL,
        "balance_after" numeric(12, 2) NOT NULL,
        "description" varchar(255) NOT NULL,
        "status" varchar(50) DEFAULT 'Completed' NOT NULL
      )
    `);
  }

  private async attachItems(
    rows: OrderHeaderRow[],
  ): Promise<Order[]> {
    if (rows.length === 0) {
      return [];
    }

    const ids = rows.map((row) => row.order.id);
    const itemRows = await this.db
      .select({
        item: orderItems,
        productName: products.name,
        productImageUrl: products.imageUrl,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(
        and(
          inArray(orderItems.orderId, ids),
          eq(orderItems.isArchived, false),
        ),
      );

    const byOrderId = new Map<number, OrderItem[]>();

    itemRows.forEach((row) => {
      const mapped = this.mapItem(
        row.item,
        row.productName,
        row.productImageUrl,
      );
      const existing = byOrderId.get(mapped.orderId) ?? [];
      existing.push(mapped);
      byOrderId.set(mapped.orderId, existing);
    });

    return rows.map((row) =>
      this.mapJoinedRow(row, byOrderId.get(row.order.id) ?? []),
    );
  }

  private async prepareItems(items: CreateOrderItemDto[]) {
    if (!items?.length) {
      throw new BadRequestException('Order must include at least one product');
    }

    const merged = new Map<number, { quantity: number; productPrice?: number }>();
    items.forEach((item) => {
      if (!Number.isInteger(item.productId)) {
        throw new BadRequestException('Product is required');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than 0');
      }

      if (
        item.productPrice !== undefined &&
        (!Number.isFinite(Number(item.productPrice)) || Number(item.productPrice) < 0)
      ) {
        throw new BadRequestException('Product price must be 0 or greater');
      }

      const existing = merged.get(item.productId);
      merged.set(item.productId, {
        quantity: (existing?.quantity ?? 0) + item.quantity,
        productPrice: item.productPrice ?? existing?.productPrice,
      });
    });

    const productIds = Array.from(merged.keys());
    const productRows = await this.db
      .select()
      .from(products)
      .where(inArray(products.id, productIds));

    if (productRows.length !== productIds.length) {
      throw new BadRequestException('One or more products do not exist');
    }

    return productRows.map((product) => {
      if (!product.inStock) {
        throw new BadRequestException(`${product.name} is out of stock`);
      }

      const line = merged.get(product.id);
      const quantity = line?.quantity ?? 0;
      const productPrice = Number(line?.productPrice ?? product.salePrice);

      return {
        productId: product.id,
        quantity,
        productPrice,
        subtotal: productPrice * quantity,
      };
    });
  }

  private async findCustomer(customerId: number) {
    const [customer] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, customerId));

    return customer ?? null;
  }

  private preserveExistingItemPrices(
    items: CreateOrderItemDto[],
    existingItems: OrderItem[],
  ) {
    const existingPriceByProductId = new Map(
      existingItems.map((item) => [item.productId, item.productPrice]),
    );

    return items.map((item) => ({
      ...item,
      productPrice:
        item.productPrice ?? existingPriceByProductId.get(item.productId),
    }));
  }

  private async deductWalletForOrder(
    tx: OrderTransaction,
    orderId: number,
    orderNumber: string,
    customerId: number,
    total: number,
  ) {
    const amount = total.toFixed(2);

    const [deductedOrder] = await tx
      .update(orders)
      .set({
        walletDeducted: true,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.walletDeducted, false)))
      .returning({ id: orders.id });

    if (!deductedOrder) {
      return;
    }

    const [updatedProfile] = await tx
      .update(profiles)
      .set({
        walletAmount: sql<string>`${profiles.walletAmount} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(profiles.userId, customerId),
          sql`${profiles.walletAmount} >= ${amount}`,
        ),
      )
      .returning({
        id: profiles.id,
        walletAmount: profiles.walletAmount,
      });

    if (!updatedProfile) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const balanceAfter = Number(updatedProfile.walletAmount);
    const amountValue = Number(amount);

    await this.createWalletHistoryRecord(tx, {
      userId: customerId,
      orderId,
      type: 'Debit',
      amount: amountValue,
      balanceBefore: this.roundCurrency(balanceAfter + amountValue),
      balanceAfter,
      description: `Order ${orderNumber} Created`,
    });
  }

  private async creditWalletForOrder(
    tx: OrderTransaction,
    orderId: number,
    orderNumber: string,
    customerId: number,
    total: number,
  ) {
    const amount = total.toFixed(2);

    const [creditedOrder] = await tx
      .update(orders)
      .set({
        walletCredited: true,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.walletCredited, false)))
      .returning({ id: orders.id });

    if (!creditedOrder) {
      return;
    }

    const [updatedProfile] = await tx
      .update(profiles)
      .set({
        walletAmount: sql<string>`${profiles.walletAmount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, customerId))
      .returning({
        id: profiles.id,
        walletAmount: profiles.walletAmount,
      });

    if (!updatedProfile) {
      throw new BadRequestException('Customer wallet profile does not exist');
    }

    const balanceAfter = Number(updatedProfile.walletAmount);
    const amountValue = Number(amount);

    await this.createWalletHistoryRecord(tx, {
      userId: customerId,
      orderId,
      type: 'Credit',
      amount: amountValue,
      balanceBefore: this.roundCurrency(balanceAfter - amountValue),
      balanceAfter,
      description: `Order ${orderNumber} Delivered`,
    });
  }

  private async createWalletHistoryRecord(
    tx: OrderTransaction,
    values: {
      userId: number;
      orderId: number;
      type: 'Debit' | 'Credit';
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      description: string;
    },
  ) {
    await tx.insert(walletHistory).values({
      userId: values.userId,
      orderId: values.orderId,
      type: values.type,
      amount: values.amount.toFixed(2),
      balanceBefore: values.balanceBefore.toFixed(2),
      balanceAfter: values.balanceAfter.toFixed(2),
      description: values.description,
      status: 'Completed',
    });
  }

  private calculateWalletHoldTotal(
    items: Array<{ subtotal: number }>,
    notes?: string | null,
  ) {
    const vipMultiplier = this.getVipMultiplier(notes);
    const finalSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    return this.roundCurrency(finalSubtotal / vipMultiplier);
  }

  private calculateWalletHoldTotalFromOrder(
    order: Pick<Order, 'subtotal'>,
    notes?: string | null,
  ) {
    return this.roundCurrency(
      Number(order.subtotal ?? 0) / this.getVipMultiplier(notes),
    );
  }

  private getVipMultiplier(notes?: string | null) {
    const match = (notes ?? '').match(
      /VIP\s*\d+(?:\s*\(\+?(\d+(?:\.\d+)?)%\))?/i,
    );
    const vipProfitPercent = match?.[1] ? Number(match[1]) : 0;

    if (!Number.isFinite(vipProfitPercent) || vipProfitPercent <= 0) {
      return 1;
    }

    return 1 + vipProfitPercent / 100;
  }

  private roundCurrency(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private validateStatus(status: string) {
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException('Invalid order status');
    }
  }

  private async normalizePaymentType(paymentType?: string | null) {
    const code = paymentType?.trim().toLowerCase();

    if (!code) {
      return null;
    }

    const [method] = await this.db
      .select({ code: paymentMethods.code })
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.code, code),
          eq(paymentMethods.isActive, true),
          eq(paymentMethods.isArchived, false),
        ),
      );

    if (!method) {
      throw new BadRequestException('Selected payment type is invalid or inactive');
    }

    return method.code;
  }

  private normalizeShippingAmount(value?: number) {
    const amount = Number(value ?? 0);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new BadRequestException('Shipping amount must be 0 or greater');
    }

    return amount;
  }

  private generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  private map(row: OrderRow, items: OrderItem[]): Order {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

    return {
      ...row,
      status: row.status as OrderStatus,
      subtotal,
      shippingAmount: Number(row.shippingAmount ?? 0),
      total: Number(row.total),
      walletDeducted: Boolean(row.walletDeducted),
      walletCredited: Boolean(row.walletCredited),
      items,
    };
  }

  private mapItem(
    row: OrderItemRow,
    productName: string | null,
    productImageUrl: string | null,
  ): OrderItem {
    return {
      ...row,
      productName,
      productImageUrl,
      productPrice: Number(row.productPrice),
      subtotal: Number(row.subtotal),
    };
  }

  private mapJoinedRow(
    row: OrderHeaderRow,
    items: OrderItem[],
  ): Order {
    return {
      ...this.map(row.order, items),
      customerName:
        row.profileName ?? row.order.customerName ?? row.customerLogin ?? null,
      customerEmail:
        row.profileEmail ??
        row.order.customerEmail ??
        row.customerLogin ??
        null,
      customerLogin: row.customerLogin ?? null,
    };
  }

  private mapWalletHistory(row: {
    history: typeof walletHistory.$inferSelect;
    orderNumber: string | null;
  }): WalletHistoryRecord {
    return {
      ...row.history,
      orderNumber: row.orderNumber,
      type: row.history.type as WalletHistoryRecord['type'],
      amount: Number(row.history.amount),
      balanceBefore: Number(row.history.balanceBefore),
      balanceAfter: Number(row.history.balanceAfter),
      status: row.history.status as WalletHistoryRecord['status'],
    };
  }
}
