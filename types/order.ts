export type OrderStatus =
  | "awaiting_payment"
  | "payment_reported"
  | "paid"
  | "purchased"
  | "delivered"
  | "expired";

export type MockOrder = {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  createdAt: string;
  expiresAt: string;
  totalBob: number;
  status: OrderStatus;
  items: readonly {
    name: string;
    quantity: number;
    unitPriceBob: number;
  }[];
};
