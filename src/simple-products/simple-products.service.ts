import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSimpleProductDto } from './dto/create-simple-product.dto';
import { UpdateSimpleProductDto } from './dto/update-simple-product.dto';
import { SimpleProductsRepository } from './simple-products.repository';

@Injectable()
export class SimpleProductsService {
  constructor(
    private readonly simpleProductsRepository: SimpleProductsRepository,
  ) {}

  create(dto: CreateSimpleProductDto) {
    return this.simpleProductsRepository.create(dto);
  }

  findAll() {
    return this.simpleProductsRepository.findAll();
  }

  async findOne(id: number) {
    const product = await this.simpleProductsRepository.findOne(id);

    if (!product) {
      throw new NotFoundException('Simple product not found');
    }

    return product;
  }

  async update(id: number, dto: UpdateSimpleProductDto) {
    const product = await this.simpleProductsRepository.update(id, dto);

    if (!product) {
      throw new NotFoundException('Simple product not found');
    }

    return product;
  }

  async remove(id: number) {
    const deleted = await this.simpleProductsRepository.remove(id);

    if (!deleted) {
      throw new NotFoundException('Simple product not found');
    }

    return { deleted };
  }
}
