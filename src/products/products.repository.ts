import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AbstractBaseRepository } from '../common/base/base.repository';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { productCategories } from '../product-categories/schema/product-categories.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './interfaces/product.interface';
import { products } from './schema/products.schema';

@Injectable()
export class ProductsRepository extends AbstractBaseRepository<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    db: NodePgDatabase,
  ) {
    super(db, products);
  }

  override async findAll() {
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
      .where(eq(products.isArchived, false))
      .orderBy(desc(products.id));
  }

  override async findOne(id: number) {
    const [product] = await this.db
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
      .where(and(eq(products.id, id), eq(products.isArchived, false)));

    return product ?? null;
  }

  protected override toCreateValues(dto: CreateProductDto) {
    const salePrice = dto.salePrice;
    if (salePrice === undefined || salePrice === null) {
      throw new BadRequestException('salePrice is required');
    }

    const costPrice = dto.costPrice ?? salePrice;

    return {
      name: dto.name,
      categoryId: dto.categoryId,
      description: dto.description ?? null,
      imageUrl: dto.imageUrl ?? null,
      salePrice: salePrice.toString(),
      costPrice: costPrice.toString(),
      inStock: dto.inStock,
      isPublished: dto.isPublished,
    };
  }

  protected override toUpdateValues(dto: UpdateProductDto) {
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

    return values;
  }
}
