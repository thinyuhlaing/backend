import { NotFoundException } from '@nestjs/common';

export interface AbstractBaseRepository<Entity, CreateDto, UpdateDto> {
  create(dto: CreateDto): Promise<Entity> | Entity;
  findAll(): Promise<Entity[]> | Entity[];
  findOne(id: number): Promise<Entity | null> | Entity | null;
  update(id: number, dto: UpdateDto): Promise<Entity | null> | Entity | null;
  remove(id: number): Promise<boolean> | boolean;
}

export abstract class AbstractBaseService<Entity, CreateDto, UpdateDto> {
  constructor(
    protected readonly repository: AbstractBaseRepository<
      Entity,
      CreateDto,
      UpdateDto
    >,
    // protected readonly notFoundMessage: string,
  ) { }

  create(dto: CreateDto) {
    return this.repository.create(dto);
  }

  findAll() {
    return this.repository.findAll();
  }

  async findOne(id: number) {
    const entity = await this.repository.findOne(id);
    // if (!entity) {
    //   throw new NotFoundException(this.notFoundMessage);
    // }

    return entity;
  }

  async update(id: number, dto: UpdateDto) {
    const entity = await this.repository.update(id, dto);
    return entity;
  }

  async remove(id: number) {
    const deleted = await this.repository.remove(id);
    return { deleted: true };
  }
}
