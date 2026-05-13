import { Controller } from '@nestjs/common';
import { AbstractBaseController } from 'src/common/base/base.controller';
import { CreateDeliveryMethodDto } from './dto/create-delivery-method.dto';
import { UpdateDeliveryMethodDto } from './dto/update-delivery-method.dto';
import { DeliveryMethodsService } from './delivery-methods.service';

@Controller('delivery_methods')
export class DeliveryMethodsController extends AbstractBaseController<
    CreateDeliveryMethodDto,
    UpdateDeliveryMethodDto
> {
    constructor(private readonly deliveryMethodService: DeliveryMethodsService) {
        super(deliveryMethodService);
    }
}