import { AbstractBaseInterface } from 'src/common/base/base.interface';

export interface ProductCategory extends AbstractBaseInterface {
  name: string;
  completeName: string;
  parentId: number | null;
}
