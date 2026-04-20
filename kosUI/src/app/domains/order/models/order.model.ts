export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING        = 'PENDING',
  PAID           = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  REFUNDED       = 'REFUNDED'
}

export enum OrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY'
}

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  category?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  tableId?: number;
  tableName?: string;
  status: OrderStatus;
  priority: OrderPriority;
  type: OrderType;
  items: OrderItem[];
  totalAmount: number;
  customerName?: string;
  waiterName?: string;
  orderTime: Date;
  prepTime?: number; // in minutes
  estimatedTime?: number; // in minutes
  notes?: string;
  paymentStatus?: PaymentStatus;
  paymentDate?: Date;
  address?: string;
  sessionId?: string;
  kotRound?: number;
  readyAt?: Date;   // client-side timestamp — set when SSE fires status → READY
}
