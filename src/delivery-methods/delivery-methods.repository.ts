import { Inject, Injectable } from "@nestjs/common";
import { desc, eq, and } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { DRIZZLE_DB_PROVIDER } from "../database/database.constants";
import { CreateDeliveryMethodDto } from "./dto/create-delivery-method.dto";
import { UpdateDeliveryMethodDto } from "./dto/update-delivery-method.dto";
import { deliveryMethods } from "./schema/delivery-methods.schema";

@Injectable()
export class DeliveryMethodsRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) { }

  // helper to normalize DB → API
  private map(row: any) {
    if (!row) return null;

    return {
      ...row,
      fixedPrice: Number(row.fixedPrice), // 🔥 FIX HERE
    };
  }

  async create(dto: CreateDeliveryMethodDto) {
    const [method] = await this.db
      .insert(deliveryMethods)
      .values({
        name: dto.name,
        fixedPrice: dto.fixedPrice.toString(), // DB expects string
      })
      .returning();

    return this.map(method);
  }

  async findAll() {
    const rows = await this.db
      .select()
      .from(deliveryMethods)
      .where(eq(deliveryMethods.isArchived, false))
      .orderBy(desc(deliveryMethods.id));

    return rows.map(this.map);
  }

  async findOne(id: number) {
    const [method] = await this.db
      .select()
      .from(deliveryMethods)
      .where(
        and(
          eq(deliveryMethods.id, id),
          eq(deliveryMethods.isArchived, false),
        ),
      );

    return this.map(method);
  }

  async update(id: number, dto: UpdateDeliveryMethodDto) {
    const values: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.fixedPrice !== undefined) {
      values.fixedPrice = dto.fixedPrice.toString(); // DB string
    }

    const [method] = await this.db
      .update(deliveryMethods)
      .set(values)
      .where(eq(deliveryMethods.id, id))
      .returning();

    return this.map(method);
  }

  async remove(id: number) {
    const [deleted] = await this.db
      .update(deliveryMethods)
      .set({
        isArchived: true,
        updatedAt: new Date(),
      })
      .where(eq(deliveryMethods.id, id))
      .returning({ id: deliveryMethods.id });

    return !!deleted;
  }
}