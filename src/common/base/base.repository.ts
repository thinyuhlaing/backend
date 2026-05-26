import { and, desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface AbstractBaseRepositoryContract<Entity, CreateDto, UpdateDto> {
  create(dto: CreateDto): Promise<Entity> | Entity;
  findAll(): Promise<Entity[]> | Entity[];
  findOne(id: number): Promise<Entity | null> | Entity | null;
  update(id: number, dto: UpdateDto): Promise<Entity | null> | Entity | null;
  remove(id: number): Promise<boolean> | boolean;
}

export abstract class AbstractBaseRepository<Entity, CreateDto, UpdateDto>
  implements AbstractBaseRepositoryContract<Entity, CreateDto, UpdateDto>
{
  protected constructor(
    protected readonly db: NodePgDatabase,
    protected readonly table: any,
  ) {}

  async create(dto: CreateDto): Promise<Entity> {
    const rows = (await this.db
      .insert(this.table)
      .values(this.toCreateValues(dto))
      .returning()) as Entity[];

    return rows[0];
  }

  async findAll(): Promise<Entity[]> {
    let query = this.db.select().from(this.table).$dynamic();

    if (this.table.isArchived) {
      query = query.where(eq(this.table.isArchived, false));
    }

    if (this.table.id) {
      query = query.orderBy(desc(this.table.id));
    }

    return (await query) as Entity[];
  }

  async findOne(id: number): Promise<Entity | null> {
    const filters = [eq(this.table.id, id)];

    if (this.table.isArchived) {
      filters.push(eq(this.table.isArchived, false));
    }

    const [entity] = await this.db
      .select()
      .from(this.table)
      .where(filters.length > 1 ? and(...filters) : filters[0]);

    return (entity as Entity) ?? null;
  }

  async update(id: number, dto: UpdateDto): Promise<Entity | null> {
    const rows = (await this.db
      .update(this.table)
      .set(this.toUpdateValues(dto))
      .where(eq(this.table.id, id))
      .returning()) as Entity[];

    return rows[0] ?? null;
  }

  async remove(id: number): Promise<boolean> {
    if (this.table.isArchived) {
      const archived = (await this.db
        .update(this.table)
        .set({
          isArchived: true,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning({ id: this.table.id })) as { id: number }[];

      return archived.length > 0;
    }

    const deleted = (await this.db
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning({ id: this.table.id })) as { id: number }[];

    return deleted.length > 0;
  }

  protected toCreateValues(dto: CreateDto): Record<string, unknown> {
    return dto as Record<string, unknown>;
  }

  protected toUpdateValues(dto: UpdateDto): Record<string, unknown> {
    return {
      ...(dto as Record<string, unknown>),
      updatedAt: new Date(),
    };
  }
}
