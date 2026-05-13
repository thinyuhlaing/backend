import { AbstractBaseInterface } from 'src/common/base/base.interface';

export interface PaymentMethod extends AbstractBaseInterface {
  name: string;
  code: string;
  details?: string | null;
  isActive: boolean;
}
