import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, and } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { paymentMethods } from './schema/payment-methods.schema';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) { }

  private map(row: any) {
    if (!row) return null;

    return {
      ...row,
      isActive: Boolean(row.isActive), // ensure boolean safety
    };
  }

  async create(dto: CreatePaymentMethodDto) {
    const [method] = await this.db
      .insert(paymentMethods)
      .values({
        name: dto.name,
        code: dto.code,
        details: dto.details ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return this.map(method);
  }

  async findAll() {
    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(desc(paymentMethods.id));

    return rows.map(this.map);
  }

  async findOne(id: number) {
    const [method] = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.id, id),
          eq(paymentMethods.isActive, true),
        ),
      );

    return this.map(method);
  }

  async update(id: number, dto: UpdatePaymentMethodDto) {
    const values: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.code !== undefined) values.code = dto.code;
    if (dto.details !== undefined) values.details = dto.details;
    if (dto.isActive !== undefined) values.isActive = dto.isActive;

    const [method] = await this.db
      .update(paymentMethods)
      .set(values)
      .where(eq(paymentMethods.id, id))
      .returning();

    return this.map(method);
  }

  async remove(id: number) {
    const [deleted] = await this.db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id });

    return !!deleted;
  }
}