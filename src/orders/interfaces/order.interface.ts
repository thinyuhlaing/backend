import { AbstractBaseInterface } from 'src/common/base/base.interface';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Delivered' | 'Cancelled';

export interface OrderItem extends AbstractBaseInterface {
  orderId: number;
  productId: number;
  productName?: string | null;
  productImageUrl?: string | null;
  quantity: number;
  productPrice: number;
  subtotal: number;
}

export interface Order extends AbstractBaseInterface {
  orderNumber: string;
  customerId: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerLogin?: string | null;
  orderDate: string;
  subtotal: number;
  shippingAmount: number;
  total: number;
  walletDeducted: boolean;
  walletCredited: boolean;
  status: OrderStatus;
  items: OrderItem[];
  notes?: string | null;
  shippingAddress?: string | null;
  contactPhone?: string | null;
  paymentType?: string | null;
}

export type WalletHistoryType = 'Debit' | 'Credit';
export type WalletHistoryStatus = 'Completed';

export interface WalletHistoryRecord extends AbstractBaseInterface {
  userId: number;
  orderId: number | null;
  orderNumber?: string | null;
  type: WalletHistoryType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: WalletHistoryStatus;
}
