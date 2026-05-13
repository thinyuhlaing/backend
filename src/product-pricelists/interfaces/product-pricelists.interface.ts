import { AbstractBaseInterface } from 'src/common/base/base.interface';

export interface ProductPricelist extends AbstractBaseInterface {
  name: string;
}

export interface ProductPricelistItem {
  id: number;
  name: string;
  pricelist_id: number;
  base: string;
  compute_price: string;
  product_id: number | null;
  fixed_price: number;
  price_discount: string;
}