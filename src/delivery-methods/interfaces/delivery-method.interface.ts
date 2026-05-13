import { AbstractBaseInterface } from "src/common/base/base.interface";

export interface DeliveryMethod extends AbstractBaseInterface {
  name: string;
  fixedPrice: number;
}