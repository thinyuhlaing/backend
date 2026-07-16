import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './interfaces/product-category.interface';
import { productCategories } from './schema/product-categories.schema';

type ProductCategoryRow = typeof productCategories.$inferSelect;

@Injectable()
export class ProductCategoriesRepository {
  private schemaReady?: Promise<void>;

  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) { }

  async create(dto: CreateProductCategoryDto) {
    await this.ensureSchema();
    const parentId = dto.parentId ?? null;
    await this.assertValidParent(null, parentId);
    const completeName = await this.buildCompleteName(dto.name, parentId);

    const [category] = await this.db
      .insert(productCategories)
      .values({
        name: dto.name,
        completeName,
        parentId,
      })
      .returning();

    return this.toCategory(category, completeName);
  }

  async findAll() {
    await this.ensureSchema();
    const categories = await this.db
      .select()
      .from(productCategories)
      .orderBy(desc(productCategories.id));

    return Promise.all(categories.map((category) => this.hydrateCategory(category)));
  }

  async findOne(id: number) {
    await this.ensureSchema();
    const category = await this.findRawOne(id);

    if (!category) {
      return null;
    }

    return this.hydrateCategory(category);
  }

  async update(id: number, dto: UpdateProductCategoryDto) {
    await this.ensureSchema();
    const existingCategory = await this.findRawOne(id);

    if (!existingCategory) {
      return null;
    }

    const nextName = dto.name ?? existingCategory.name;
    const nextParentId =
      dto.parentId !== undefined
        ? dto.parentId
        : this.normalizeParentId(existingCategory.parentId);
    await this.assertValidParent(id, nextParentId);
    const nextCompleteName = await this.buildCompleteName(nextName, nextParentId);

    const values: {
      name?: string;
      completeName: string;
      parentId?: number | null;
      updatedAt: Date;
    } = {
      completeName: nextCompleteName,
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) {
      values.name = dto.name;
    }

    if (dto.parentId !== undefined) {
      values.parentId = dto.parentId;
    }

    const [category] = await this.db
      .update(productCategories)
      .set(values)
      .where(eq(productCategories.id, id))
      .returning();

    if (category) {
      await this.refreshDescendantCompleteNames(category.id, new Set([category.id]));
    }

    return category ? this.toCategory(category, nextCompleteName) : null;
  }

  async remove(id: number) {
    await this.ensureSchema();
    const deleted = await this.db
      .delete(productCategories)
      .where(eq(productCategories.id, id))
      .returning({ id: productCategories.id });

    return deleted.length > 0;
  }

  private async findByParentId(parentId: number): Promise<ProductCategoryRow[]> {
    await this.ensureSchema();

    if (!this.isValidId(parentId)) {
      return [];
    }

    return this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.parentId, parentId));
  }

  private async findRawOne(id: number): Promise<ProductCategoryRow | null> {
    await this.ensureSchema();

    if (!this.isValidId(id)) {
      return null;
    }

    const [category] = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id));

    return category ?? null;
  }

  private async buildCompleteName(
    name: string,
    parentId: number | null,
  ): Promise<string> {
    const normalizedParentId = this.normalizeParentId(parentId);

    if (normalizedParentId == null) {
      return name;
    }

    const parentCategory = await this.findRawOne(normalizedParentId);

    if (!parentCategory) {
      return name;
    }

    const parentName = await this.resolveCompleteName(
      parentCategory,
      new Set([parentCategory.id]),
    );
    return `${parentName} / ${name}`;
  }

  private async refreshDescendantCompleteNames(
    parentId: number,
    visited: Set<number>,
  ): Promise<void> {
    const children = await this.findByParentId(parentId);

    for (const child of children) {
      if (visited.has(child.id)) {
        continue;
      }

      const completeName = await this.buildCompleteName(
        child.name,
        this.normalizeParentId(child.parentId),
      );

      await this.db
        .update(productCategories)
        .set({
          completeName,
          updatedAt: new Date(),
        })
        .where(eq(productCategories.id, child.id));

      visited.add(child.id);
      await this.refreshDescendantCompleteNames(child.id, visited);
    }
  }

  private async hydrateCategory(
    category: ProductCategoryRow,
  ): Promise<ProductCategory> {
    const completeName = await this.resolveCompleteName(category, new Set([category.id]));
    return this.toCategory(category, completeName);
  }

  private toCategory(
    category: ProductCategoryRow,
    completeName: string,
  ): ProductCategory {
    return {
      ...category,
      parentId: this.normalizeParentId(category.parentId),
      completeName,
    };
  }

  private async resolveCompleteName(
    category: ProductCategoryRow,
    visited: Set<number>,
  ): Promise<string> {
    const parentId = this.normalizeParentId(category.parentId);

    if (parentId == null) {
      return category.name;
    }

    const parentCategory = await this.findRawOne(parentId);

    if (!parentCategory || visited.has(parentCategory.id)) {
      return category.name;
    }

    visited.add(parentCategory.id);
    const parentCompleteName = await this.resolveCompleteName(
      parentCategory,
      visited,
    );

    return `${parentCompleteName} / ${category.name}`;
  }

  private async assertValidParent(
    currentCategoryId: number | null,
    parentId: number | null,
  ): Promise<void> {
    if (parentId == null) {
      return;
    }

    if (!this.isValidId(parentId)) {
      throw new BadRequestException('Parent category id must be a valid integer.');
    }

    if (currentCategoryId !== null && parentId === currentCategoryId) {
      throw new BadRequestException('A category cannot be its own parent.');
    }

    let nextParentId: number | null = parentId;
    const visited = new Set<number>();

    while (nextParentId != null) {
      if (visited.has(nextParentId)) {
        throw new BadRequestException('Category parent cycle detected.');
      }

      visited.add(nextParentId);

      if (currentCategoryId !== null && nextParentId === currentCategoryId) {
        throw new BadRequestException(
          'A category cannot use its own child as parent.',
        );
      }

      const parentCategory = await this.findRawOne(nextParentId);
      nextParentId = this.normalizeParentId(parentCategory?.parentId);
    }
  }

  private normalizeParentId(parentId: number | null | undefined): number | null {
    return this.isValidId(parentId) ? parentId : null;
  }

  private isValidId(id: number | null | undefined): id is number {
    return typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
  }

  private async ensureSchema() {
    this.schemaReady ??= this.applySchemaPatch();
    return this.schemaReady;
  }

  private async applySchemaPatch() {
    await this.db.execute(
      sql`ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "complete_name" text`,
    );
    await this.db.execute(
      sql`CREATE SEQUENCE IF NOT EXISTS "product_categories_id_seq" OWNED BY "product_categories"."id"`,
    );
    await this.db.execute(
      sql`ALTER TABLE "product_categories" ALTER COLUMN "id" SET DEFAULT nextval('"product_categories_id_seq"'::regclass)`,
    );
    await this.db.execute(
      sql`SELECT setval('"product_categories_id_seq"'::regclass, COALESCE((SELECT MAX("id") FROM "product_categories"), 0) + 1, false)`,
    );
    await this.db.execute(
      sql`ALTER TABLE "product_categories" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
    await this.db.execute(
      sql`ALTER TABLE "product_categories" ALTER COLUMN "updated_at" SET DEFAULT now()`,
    );
    await this.db.execute(
      sql`ALTER TABLE "product_categories" ALTER COLUMN "is_archived" SET DEFAULT false`,
    );
  }
}
