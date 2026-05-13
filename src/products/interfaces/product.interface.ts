import { AbstractBaseInterface } from 'src/common/base/base.interface';

export interface Product extends AbstractBaseInterface {
  name: string;
  categoryId: number;
  description: string | null;
  imageUrl?: string | null;
  salePrice: string;
  costPrice: string;
  inStock: boolean;
  isPublished: boolean;
  categoryName?: string | null;
}
// classes - interface, abstract
// Dependency injection
// Expection Filter
// Pipes

// pipeline,composable
