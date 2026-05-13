import { Injectable } from '@nestjs/common';
import { AbstractBaseService } from 'src/common/base/base.service';
import { DeliveryMethod } from './interfaces/delivery-method.interface';
import { CreateDeliveryMethodDto } from './dto/create-delivery-method.dto';
import { UpdateDeliveryMethodDto } from './dto/update-delivery-method.dto';
import { DeliveryMethodsRepository } from './delivery-methods.repository';

@Injectable()
export class DeliveryMethodsService extends AbstractBaseService<
    DeliveryMethod,
    CreateDeliveryMethodDto,
    UpdateDeliveryMethodDto
> {
    constructor(
        private readonly deliveryMethodRepository: DeliveryMethodsRepository,
    ) {
        super(deliveryMethodRepository);
    }
}