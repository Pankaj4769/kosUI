// src/app/domains/pos/models/table.model.ts

// ✅ EXISTING: TableStatus type (PRESERVED)
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

// ✨ NEW: Area type for zone management
export type AreaType = 'main-hall' | 'terrace' | 'vip-lounge' | 'bar';

// ✅ EXISTING: Table interface (PRESERVED + ENHANCED)
export interface Table {
  // ✅ EXISTING: All original properties preserved
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

  // ✨ NEW: Optional extended properties for enhanced features
  area?: AreaType;                  // For area/zone filtering
  startTime?: Date | string;        // Alternative to timeOccupied for compatibility
  reservationDetails?: ReservationDetails;  // For reservation info display
  serverName?: string;              // Alternative to waiter for compatibility
  sessionDuration?: number;         // Cached duration in minutes
  
  // ✅ ADDED FOR PRIORITY FEATURE (Fixes Component Errors)
  isPriority?: boolean;             
}

// ✅ EXISTING: TableStatusEnum (PRESERVED)
export enum TableStatusEnum {
  FREE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  CLEANING = 'cleaning'
}

// ✅ EXISTING: TableBooking interface (PRESERVED)
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

// ✅ EXISTING: TableStats interface (PRESERVED)
export interface TableStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  cleaning: number;
  occupancyRate: number;
}

// ✨ NEW: ReservationDetails for table reservation info
export interface ReservationDetails {
  id: number;
  customerName: string;
  phoneNumber?: string;
  email?: string;
  time: string;
  guests: number;
  specialRequests?: string;
  arrived: boolean;
}

// ✨ NEW: Full Reservation interface for upcoming reservations
export interface Reservation {
  id: number;
  tableNumber: number;
  tableId: number;
  customerName: string;
  phoneNumber?: string;
  email?: string;
  guests: number;
  date: string;
  time: string;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'cancelled';
  createdAt: Date | string;
}

// ✨ NEW: Extended TableStats for enhanced features
export interface ExtendedTableStats extends TableStats {
  dirty?: number;              // Count of cleaning tables
  pending?: number;            // Occupied + Reserved
  revenue?: number;            // Total revenue
  avgSessionTime?: number;     // Average session duration
}

// ✨ NEW: Area configuration interface
export interface AreaConfig {
  id: AreaType;
  label: string;
  icon?: string;
  tableCount: number;
  capacity: number;
}

// ✨ NEW: Layout position interface
export interface LayoutPosition {
  tableId: number;
  x: number;
  y: number;
  rotation?: number;
}

// ✨ NEW: Bill details interface
export interface BillDetails {
  tableId: number;
  billNumber: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  items: BillItem[];
  startTime: Date | string;
  paymentStatus: 'pending' | 'partial' | 'paid';
}

// ✨ NEW: Bill item interface
export interface BillItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

// ✨ NEW: Status display helpers
export const TableStatusConfig: Record<TableStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  available: {
    label: 'Available',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    icon: '🟢'
  },
  occupied: {
    label: 'Occupied',
    color: '#ef4444',
    bgColor: '#fef2f2',
    icon: '🔴'
  },
  reserved: {
    label: 'Reserved',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    icon: '🟡'
  },
  cleaning: {
    label: 'Cleaning',
    color: '#6b7280',
    bgColor: '#f9fafb',
    icon: '🧹'
  }
};

// ✨ NEW: Area configuration data
export const AreaConfigs: AreaConfig[] = [
  {
    id: 'main-hall',
    label: 'Main Hall',
    icon: '🏛️',
    tableCount: 0,
    capacity: 0
  },
  {
    id: 'terrace',
    label: 'Terrace',
    icon: '🌿',
    tableCount: 0,
    capacity: 0
  },
  {
    id: 'vip-lounge',
    label: 'VIP Lounge',
    icon: '👑',
    tableCount: 0,
    capacity: 0
  },
  {
    id: 'bar',
    label: 'Bar',
    icon: '🍸',
    tableCount: 0,
    capacity: 0
  }
];

// ✨ NEW: Helper utility class
export class TableHelpers {

  static isTableAvailable(table: Table): boolean {
    return table.status === 'available';
  }

  static isTableOccupied(table: Table): boolean {
    return table.status === 'occupied';
  }

  static isTableReserved(table: Table): boolean {
    return table.status === 'reserved';
  }

  static isTableDirty(table: Table): boolean {
    return table.status === 'cleaning';
  }

  static getTableCapacityLabel(capacity: number): string {
    return `${capacity} Seats`;
  }

  static getStatusIcon(status: TableStatus): string {
    return TableStatusConfig[status]?.icon || '⚪';
  }

  static getStatusColor(status: TableStatus): string {
    return TableStatusConfig[status]?.color || '#6b7280';
  }

  static formatTableNumber(id: number): string {
    return id.toString().padStart(2, '0');
  }

  static calculateSessionDuration(startTime: Date | string): number {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000); // minutes
  }

  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  static getAreaLabel(area?: AreaType): string {
    if (!area) return 'Main Hall';
    const config = AreaConfigs.find(a => a.id === area);
    return config?.label || 'Unknown Area';
  }

  // ✨ NEW: Map section to area for backward compatibility
  static mapSectionToArea(section?: string): AreaType {
    if (!section) return 'main-hall';

    const sectionMap: Record<string, AreaType> = {
      'A': 'main-hall',
      'B': 'terrace',
      'C': 'vip-lounge',
      'VIP': 'vip-lounge',
      'BAR': 'bar'
    };

    return sectionMap[section.toUpperCase()] || 'main-hall';
  }
}
