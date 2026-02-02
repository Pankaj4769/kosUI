// src/app/domains/pos/models/table.model.ts

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface Table {
  id: number;
  number: number;
  name: string;
  status: TableStatus;
  capacity: number;
  currentOrder?: string;
  waiter?: string;
  timeOccupied?: Date;
  section?: string;
  position?: { x: number; y: number };
  amount?: number;
  itemCount?: number;
  totalAmount?: number;
  openedAt?: Date;
}

export enum TableStatusEnum {
  FREE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning'
}

export interface TableBooking {
  id: string;
  tableId: number;
  customerName: string;
  customerPhone: string;
  partySize: number;
  bookingTime: Date;
  duration: number;
  specialRequests?: string;
}

export interface TableStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  occupancyRate: number;
}
