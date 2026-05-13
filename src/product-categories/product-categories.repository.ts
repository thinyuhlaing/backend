import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './interfaces/product-category.interface';
import { productCategories } from './schema/product-categories.schema';

type ProductCategoryRow = typeof productCategories.$inferSelect;

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) {}

  async create(dto: CreateProductCategoryDto) {
    await this.assertValidParent(null, dto.parentId);
    const completeName = await this.buildCompleteName(dto.name, dto.parentId);

    const [category] = await this.db
      .insert(productCategories)
      .values({
        name: dto.name,
        completeName,
        parentId: dto.parentId,
      })
      .returning();

    return this.toCategory(category, completeName);
  }

  async findAll() {
    const categories = await this.db
      .select()
      .from(productCategories)
      .orderBy(desc(productCategories.id));

    return Promise.all(categories.map((category) => this.hydrateCategory(category)));
  }

  async findOne(id: number) {
    const category = await this.findRawOne(id);

    if (!category) {
      return null;
    }

    return this.hydrateCategory(category);
  }

  async update(id: number, dto: UpdateProductCategoryDto) {
    const existingCategory = await this.findRawOne(id);

    if (!existingCategory) {
      return null;
    }

    const nextName = dto.name ?? existingCategory.name;
    const nextParentId =
      dto.parentId !== undefined ? dto.parentId : existingCategory.parentId;
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
    const deleted = await this.db
      .delete(productCategories)
      .where(eq(productCategories.id, id))
      .returning({ id: productCategories.id });

    return deleted.length > 0;
  }

  private async findByParentId(parentId: number): Promise<ProductCategoryRow[]> {
    return this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.parentId, parentId));
  }

  private async findRawOne(id: number): Promise<ProductCategoryRow | null> {
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
    if (parentId == null) {
      return name;
    }

    const parentCategory = await this.findRawOne(parentId);

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

      const completeName = await this.buildCompleteName(child.name, child.parentId);

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
      completeName,
    };
  }

  private async resolveCompleteName(
    category: ProductCategoryRow,
    visited: Set<number>,
  ): Promise<string> {
    if (category.parentId == null) {
      return category.name;
    }

    const parentCategory = await this.findRawOne(category.parentId);

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
      nextParentId = parentCategory?.parentId ?? null;
    }
  }
}
