export interface AbstractBaseInterface {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number | null;
  updatedBy: number | null;
  isArchived: boolean;
}
