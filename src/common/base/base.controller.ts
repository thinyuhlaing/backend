import {
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';

export interface AbstractBaseService<CreateDto, UpdateDto> {
  create(dto: CreateDto): unknown;
  findAll(): unknown;
  findOne(id: number): unknown;
  update(id: number, dto: UpdateDto): unknown;
  remove(id: number): unknown;
}

export abstract class AbstractBaseController<CreateDto, UpdateDto> {
  constructor(
    protected readonly service: AbstractBaseService<CreateDto, UpdateDto>,
  ) {}

  @Post()
  create(@Body() dto: CreateDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
