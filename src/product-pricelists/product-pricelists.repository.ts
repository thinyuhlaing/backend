import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { CreateProductPricelistDto } from './dto/create-product-pricelist.dto';
import { UpdateProductPricelistDto } from './dto/update-product-pricelist.dto';
import { productPricelists } from './schema/product-pricelists';

@Injectable()
export class ProductPricelistsRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) {}

  async create(dto: CreateProductPricelistDto) {
    const [pricelist] = await this.db
      .insert(productPricelists)
      .values({
        name: dto.name,
      })
      .returning();

    return pricelist;
  }

  async findAll() {
    return await this.db
      .select()
      .from(productPricelists)
      .orderBy(desc(productPricelists.id));
  }

  async findOne(id: number) {
    const [pricelist] = await this.db
      .select()
      .from(productPricelists)
      .where(eq(productPricelists.id, id));

    return pricelist ?? null;
  }

  async update(id: number, dto: UpdateProductPricelistDto) {
    const values: {
      name?: string;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      values.name = dto.name;
    }

    const [pricelist] = await this.db
      .update(productPricelists)
      .set(values)
      .where(eq(productPricelists.id, id))
      .returning();

    return pricelist ?? null;
  }

  async remove(id: number) {
    const deleted = await this.db
      .delete(productPricelists)
      .where(eq(productPricelists.id, id))
      .returning({ id: productPricelists.id });

    return deleted.length > 0;
  }
}
