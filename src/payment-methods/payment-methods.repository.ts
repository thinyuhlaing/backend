import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';
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
      isActive: Boolean(row.isActive),
    };
  }

  async create(dto: CreatePaymentMethodDto) {
    await this.ensureUniqueCode(dto.code);

    const [method] = await this.db
      .insert(paymentMethods)
      .values({
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning();

    return this.map(method);
  }

  async findAll() {
    const rows = await this.db
      .select()
      .from(paymentMethods)
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
          eq(paymentMethods.isArchived, false),
        ),
      );

    return this.map(method);
  }

  async findActiveByCode(code: string) {
    const [method] = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.code, code),
          eq(paymentMethods.isActive, true),
          eq(paymentMethods.isArchived, false),
        ),
      );

    return this.map(method);
  }

  async update(id: number, dto: UpdatePaymentMethodDto) {
    if (dto.code !== undefined) {
      await this.ensureUniqueCode(dto.code, id);
    }

    const values: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.code !== undefined) values.code = dto.code;
    if (dto.description !== undefined) values.description = dto.description;
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
      .update(paymentMethods)
      .set({ isArchived: true, isActive: false, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning({ id: paymentMethods.id });

    return !!deleted;
  }

  private async ensureUniqueCode(code: string, currentId?: number) {
    const filters = [eq(paymentMethods.code, code)];

    if (currentId !== undefined) {
      filters.push(ne(paymentMethods.id, currentId));
    }

    const [existing] = await this.db
      .select({ id: paymentMethods.id })
      .from(paymentMethods)
      .where(and(...filters));

    if (existing) {
      throw new ConflictException('Payment type code already exists');
    }
  }
}
