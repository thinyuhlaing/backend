import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { CreateSimpleProductDto } from './dto/create-simple-product.dto';
import { UpdateSimpleProductDto } from './dto/update-simple-product.dto';
import { SimpleProduct } from './interfaces/simple-product.interface';
import { simpleProducts } from './schema/simple-products.schema';

@Injectable()
export class SimpleProductsRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) {}

  async create(dto: CreateSimpleProductDto) {
    const [product] = await this.db
      .insert(simpleProducts)
      .values({
        name: dto.name,
        price: dto.price.toString(),
      })
      .returning();

    return this.map(product);
  }

  async findAll() {
    const rows = await this.db
      .select()
      .from(simpleProducts)
      .orderBy(desc(simpleProducts.id));

    return rows.map((product) => this.map(product));
  }

  async findOne(id: number) {
    const [product] = await this.db
      .select()
      .from(simpleProducts)
      .where(eq(simpleProducts.id, id));

    return this.map(product);
  }

  async update(id: number, dto: UpdateSimpleProductDto) {
    const values: {
      name?: string;
      price?: string;
    } = {};

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.price !== undefined) values.price = dto.price.toString();

    const [product] = await this.db
      .update(simpleProducts)
      .set(values)
      .where(eq(simpleProducts.id, id))
      .returning();

    return this.map(product);
  }

  async remove(id: number) {
    const [product] = await this.db
      .delete(simpleProducts)
      .where(eq(simpleProducts.id, id))
      .returning({ id: simpleProducts.id });

    return !!product;
  }

  private map(
    row: typeof simpleProducts.$inferSelect | undefined,
  ): SimpleProduct | null {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      price: Number(row.price),
    };
  }
}
