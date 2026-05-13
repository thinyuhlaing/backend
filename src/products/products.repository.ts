import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './interfaces/product.interface';
import { products } from './schema/products.schema';
import { productCategories } from '../product-categories/schema/product-categories.schema';

type ProductRow = typeof products.$inferSelect;

@Injectable()
export class ProductsRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) { }

  async create(dto: CreateProductDto) {
    const salePrice = dto.salePrice;
    if (salePrice === undefined || salePrice === null) {
      throw new BadRequestException('salePrice is required');
    }

    const costPrice = dto.costPrice ?? salePrice;

    const [product] = await this.db
      .insert(products)
      .values({
        name: dto.name,
        categoryId: dto.categoryId,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        salePrice: salePrice.toString(),
        costPrice: costPrice.toString(),
        inStock: dto.inStock,
        isPublished: dto.isPublished,
      })
      .returning();

    return product;
  }

  async findAll() {
    return await this.db
      .select({
        id: products.id,
        name: products.name,
        categoryId: products.categoryId,
        description: products.description,
        imageUrl: products.imageUrl,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
        inStock: products.inStock,
        isPublished: products.isPublished,
        categoryName: productCategories.name,

        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        createdBy: products.createdBy,
        updatedBy: products.updatedBy,
        isArchived: products.isArchived,
      })
      .from(products)
      .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
      .orderBy(desc(products.id));
  }

  async findOne(id: number) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id));

    return product ?? null;
  }

  async update(id: number, dto: UpdateProductDto) {
    const values: {
      name?: string;
      categoryId?: number;
      description?: string | null;
      imageUrl?: string | null;
      salePrice?: string;
      costPrice?: string;
      inStock?: boolean;
      isPublished?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) values.name = dto.name;
    if (dto.description !== undefined) values.description = dto.description;
    if (dto.imageUrl !== undefined) values.imageUrl = dto.imageUrl ?? null;
    if (dto.categoryId !== undefined) values.categoryId = dto.categoryId;
    if (dto.salePrice !== undefined) values.salePrice = dto.salePrice.toString();
    if (dto.costPrice !== undefined) values.costPrice = dto.costPrice.toString();
    if (dto.inStock !== undefined) values.inStock = dto.inStock;
    if (dto.isPublished !== undefined) values.isPublished = dto.isPublished;

    const [product] = await this.db
      .update(products)
      .set(values)
      .where(eq(products.id, id))
      .returning();

    return product ?? null;
  }

  async remove(id: number) {
    const deleted = await this.db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    return deleted.length > 0;
  }
}
