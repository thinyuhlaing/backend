import { AbstractBaseInterface } from 'src/common/base/base.interface';

export interface Order extends AbstractBaseInterface {
  orderNumber: string;
  customerId: number;
  customerName?: string | null;
  customerLogin?: string | null;
  orderDate: string;
  total: number;
  status: string;
}
