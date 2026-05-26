import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CreateSimpleProductDto } from './dto/create-simple-product.dto';
import { UpdateSimpleProductDto } from './dto/update-simple-product.dto';
import { SimpleProductsService } from './simple-products.service';

@Controller('simple-products')
export class SimpleProductsController {
  constructor(private readonly simpleProductsService: SimpleProductsService) {}

  @Post()
  create(@Body() dto: CreateSimpleProductDto) {
    return this.simpleProductsService.create(dto);
  }

  @Get()
  findAll() {
    return this.simpleProductsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.simpleProductsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSimpleProductDto,
  ) {
    return this.simpleProductsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.simpleProductsService.remove(id);
  }
}
