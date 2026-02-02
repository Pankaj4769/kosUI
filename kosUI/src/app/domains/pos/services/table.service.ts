// src/app/domains/pos/services/table.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Table, TableStatus, TableBooking, TableStats } from '../models/table.model';

/* ================= SERVICE ================= */

@Injectable({
  providedIn: 'root'
})
export class TableService {

  /* ================= STATE ================= */

  private tablesSubject = new BehaviorSubject<Table[]>([]);
  public tables$ = this.tablesSubject.asObservable();

  private bookingsSubject = new BehaviorSubject<TableBooking[]>([]);
  public bookings$ = this.bookingsSubject.asObservable();

  private tableOrders = new Map<number, any>();

  /* ================= CONSTRUCTOR ================= */

  constructor() {
    this.initializeTables();
  }

  /* ================= INITIALIZATION ================= */

  private initializeTables(): void {
    const tables = this.generateInitialTables();
    this.tablesSubject.next(tables);
  }

  private generateInitialTables(): Table[] {
    const now = new Date();
    
    return [
      // Section A (Tables 1-8)
      { id: 1, number: 1, name: 'Table 1', status: 'available', capacity: 4, section: 'A', position: { x: 0, y: 0 } },
      { id: 2, number: 2, name: 'Table 2', status: 'occupied', capacity: 2, section: 'A', position: { x: 1, y: 0 }, 
        currentOrder: 'ORD-2026-001', waiter: 'John Doe', timeOccupied: new Date(now.getTime() - 30 * 60000) },
      { id: 3, number: 3, name: 'Table 3', status: 'available', capacity: 4, section: 'A', position: { x: 2, y: 0 } },
      { id: 4, number: 4, name: 'Table 4', status: 'available', capacity: 6, section: 'A', position: { x: 3, y: 0 } },
      { id: 5, number: 5, name: 'Table 5', status: 'reserved', capacity: 4, section: 'A', position: { x: 0, y: 1 } },
      { id: 6, number: 6, name: 'Table 6', status: 'occupied', capacity: 2, section: 'A', position: { x: 1, y: 1 }, 
        currentOrder: 'ORD-2026-002', waiter: 'Sarah Smith', timeOccupied: new Date(now.getTime() - 15 * 60000) },
      { id: 7, number: 7, name: 'Table 7', status: 'available', capacity: 4, section: 'A', position: { x: 2, y: 1 } },
      { id: 8, number: 8, name: 'Table 8', status: 'cleaning', capacity: 8, section: 'A', position: { x: 3, y: 1 } },

      // Section B (Tables 9-16)
      { id: 9, number: 9, name: 'Table 9', status: 'available', capacity: 2, section: 'B', position: { x: 0, y: 2 } },
      { id: 10, number: 10, name: 'Table 10', status: 'available', capacity: 4, section: 'B', position: { x: 1, y: 2 } },
      { id: 11, number: 11, name: 'Table 11', status: 'occupied', capacity: 6, section: 'B', position: { x: 2, y: 2 }, 
        currentOrder: 'ORD-2026-003', waiter: 'Mike Johnson', timeOccupied: new Date(now.getTime() - 45 * 60000) },
      { id: 12, number: 12, name: 'Table 12', status: 'available', capacity: 4, section: 'B', position: { x: 3, y: 2 } },
      { id: 13, number: 13, name: 'Table 13', status: 'available', capacity: 2, section: 'B', position: { x: 0, y: 3 } },
      { id: 14, number: 14, name: 'Table 14', status: 'reserved', capacity: 4, section: 'B', position: { x: 1, y: 3 } },
      { id: 15, number: 15, name: 'Table 15', status: 'available', capacity: 4, section: 'B', position: { x: 2, y: 3 } },
      { id: 16, number: 16, name: 'Table 16', status: 'available', capacity: 6, section: 'B', position: { x: 3, y: 3 } },

      // Section C (Tables 17-24)
      { id: 17, number: 17, name: 'Table 17', status: 'occupied', capacity: 4, section: 'C', position: { x: 0, y: 4 }, 
        currentOrder: 'ORD-2026-004', waiter: 'Emma Wilson', timeOccupied: new Date(now.getTime() - 20 * 60000) },
      { id: 18, number: 18, name: 'Table 18', status: 'available', capacity: 2, section: 'C', position: { x: 1, y: 4 } },
      { id: 19, number: 19, name: 'Table 19', status: 'available', capacity: 4, section: 'C', position: { x: 2, y: 4 } },
      { id: 20, number: 20, name: 'Table 20', status: 'available', capacity: 8, section: 'C', position: { x: 3, y: 4 } },
      { id: 21, number: 21, name: 'Table 21', status: 'occupied', capacity: 4, section: 'C', position: { x: 0, y: 5 }, 
        currentOrder: 'ORD-2026-005', waiter: 'David Brown', timeOccupied: new Date(now.getTime() - 60 * 60000) },
      { id: 22, number: 22, name: 'Table 22', status: 'available', capacity: 2, section: 'C', position: { x: 1, y: 5 } },
      { id: 23, number: 23, name: 'Table 23', status: 'reserved', capacity: 6, section: 'C', position: { x: 2, y: 5 } },
      { id: 24, number: 24, name: 'Table 24', status: 'available', capacity: 4, section: 'C', position: { x: 3, y: 5 } },

      // VIP Section (Tables 25-28)
      { id: 25, number: 25, name: 'VIP Table 1', status: 'available', capacity: 8, section: 'VIP', position: { x: 0, y: 6 } },
      { id: 26, number: 26, name: 'VIP Table 2', status: 'occupied', capacity: 10, section: 'VIP', position: { x: 1, y: 6 }, 
        currentOrder: 'ORD-2026-006', waiter: 'Lisa Anderson', timeOccupied: new Date(now.getTime() - 90 * 60000) },
      { id: 27, number: 27, name: 'VIP Table 3', status: 'reserved', capacity: 6, section: 'VIP', position: { x: 2, y: 6 } },
      { id: 28, number: 28, name: 'VIP Table 4', status: 'available', capacity: 8, section: 'VIP', position: { x: 3, y: 6 } }
    ];
  }

  /* ================= GET TABLES ================= */

  getTables(): Table[] {
    return this.tablesSubject.value;
  }

  getAllTableStatuses(): Table[] {
    return this.getTables();
  }

  getTableById(id: number): Table | undefined {
    return this.tablesSubject.value.find(table => table.id === id);
  }

  getTableByNumber(number: number): Table | undefined {
    return this.tablesSubject.value.find(table => table.number === number);
  }

  getTablesBySection(section: string): Table[] {
    return this.tablesSubject.value.filter(table => table.section === section);
  }

  getTablesByStatus(status: TableStatus): Table[] {
    return this.tablesSubject.value.filter(table => table.status === status);
  }

  getAvailableTables(): Table[] {
    return this.getTablesByStatus('available');
  }

  getOccupiedTables(): Table[] {
    return this.getTablesByStatus('occupied');
  }

  getReservedTables(): Table[] {
    return this.getTablesByStatus('reserved');
  }

  /* ================= UPDATE TABLES ================= */

  updateTableStatus(tableId: number, status: TableStatus): boolean {
    const tables = this.tablesSubject.value;
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex === -1) {
      console.error(`Table with ID ${tableId} not found`);
      return false;
    }

    const updatedTable = { ...tables[tableIndex], status };
    
    if (status === 'available') {
      updatedTable.currentOrder = undefined;
      updatedTable.waiter = undefined;
      updatedTable.timeOccupied = undefined;
    }

    const updatedTables = [...tables];
    updatedTables[tableIndex] = updatedTable;

    this.tablesSubject.next(updatedTables);
    return true;
  }

  occupyTable(tableId: number, orderNumber: string, waiter: string): boolean {
    const tables = this.tablesSubject.value;
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex === -1) {
      console.error(`Table with ID ${tableId} not found`);
      return false;
    }

    if (tables[tableIndex].status === 'occupied') {
      console.warn(`Table ${tableId} is already occupied`);
      return false;
    }

    const updatedTable: Table = {
      ...tables[tableIndex],
      status: 'occupied',
      currentOrder: orderNumber,
      waiter: waiter,
      timeOccupied: new Date()
    };

    const updatedTables = [...tables];
    updatedTables[tableIndex] = updatedTable;

    this.tablesSubject.next(updatedTables);
    return true;
  }

  releaseTable(tableId: number): boolean {
    return this.updateTableStatus(tableId, 'available');
  }

  reserveTable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    
    if (!table) {
      console.error(`Table with ID ${tableId} not found`);
      return false;
    }

    if (table.status !== 'available') {
      console.warn(`Cannot reserve table ${tableId}. Current status: ${table.status}`);
      return false;
    }

    return this.updateTableStatus(tableId, 'reserved');
  }

  setTableCleaning(tableId: number): boolean {
    return this.updateTableStatus(tableId, 'cleaning');
  }

  /* ================= ORDER MANAGEMENT ================= */

  getOrderForTable(tableNumber: number): any | null {
    return this.tableOrders.get(tableNumber) || null;
  }

  setOrderForTable(tableNumber: number, orderData: any): void {
    this.tableOrders.set(tableNumber, orderData);
    
    const table = this.getTableByNumber(tableNumber);
    if (table && orderData) {
      this.occupyTable(
        table.id, 
        orderData.orderNumber || `ORD-${Date.now()}`,
        orderData.waiter || 'Staff'
      );
    }
  }

  clearTable(tableNumber: number): void {
    this.tableOrders.delete(tableNumber);
    
    const table = this.getTableByNumber(tableNumber);
    if (table) {
      this.releaseTable(table.id);
    }
  }

  /* ================= TABLE STATISTICS ================= */

  getTableStats(): TableStats {
    const tables = this.tablesSubject.value;
    const total = tables.length;
    const available = tables.filter(t => t.status === 'available').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    const cleaning = tables.filter(t => t.status === 'cleaning').length;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    return {
      total,
      available,
      occupied,
      reserved,
      cleaning,
      occupancyRate: Math.round(occupancyRate * 10) / 10
    };
  }

  /* ================= TABLE BOOKINGS ================= */

  getBookings(): TableBooking[] {
    return this.bookingsSubject.value;
  }

  addBooking(booking: Omit<TableBooking, 'id'>): string {
    const newBooking: TableBooking = {
      ...booking,
      id: this.generateBookingId()
    };

    const bookings = [...this.bookingsSubject.value, newBooking];
    this.bookingsSubject.next(bookings);
    this.reserveTable(booking.tableId);

    return newBooking.id;
  }

  cancelBooking(bookingId: string): boolean {
    const bookings = this.bookingsSubject.value;
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      console.error(`Booking with ID ${bookingId} not found`);
      return false;
    }

    this.releaseTable(booking.tableId);
    const updatedBookings = bookings.filter(b => b.id !== bookingId);
    this.bookingsSubject.next(updatedBookings);

    return true;
  }

  getBookingsByTable(tableId: number): TableBooking[] {
    return this.bookingsSubject.value.filter(b => b.tableId === tableId);
  }

  private generateBookingId(): string {
    return `BKG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /* ================= SEARCH & FILTER ================= */

  searchTables(query: string): Table[] {
    const lowerQuery = query.toLowerCase();
    return this.tablesSubject.value.filter(table =>
      table.number.toString().includes(lowerQuery) ||
      table.name.toLowerCase().includes(lowerQuery) ||
      table.section?.toLowerCase().includes(lowerQuery) ||
      table.status.toLowerCase().includes(lowerQuery) ||
      table.capacity.toString().includes(lowerQuery) ||
      table.waiter?.toLowerCase().includes(lowerQuery) ||
      table.currentOrder?.toLowerCase().includes(lowerQuery)
    );
  }

  filterTablesByCapacity(minCapacity: number, maxCapacity?: number): Table[] {
    return this.tablesSubject.value.filter(table => {
      if (maxCapacity) {
        return table.capacity >= minCapacity && table.capacity <= maxCapacity;
      }
      return table.capacity >= minCapacity;
    });
  }

  /* ================= UTILITY METHODS ================= */

  getTimeOccupied(tableId: number): number | null {
    const table = this.getTableById(tableId);
    
    if (!table || !table.timeOccupied) {
      return null;
    }

    const now = new Date();
    return now.getTime() - table.timeOccupied.getTime();
  }

  getFormattedTimeOccupied(tableId: number): string {
    const time = this.getTimeOccupied(tableId);
    
    if (!time) return '';

    const minutes = Math.floor(time / 60000);
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  isTableAvailable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    return table?.status === 'available';
  }

  canReserveTable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    return table?.status === 'available';
  }

  getSectionNames(): string[] {
    const sections = this.tablesSubject.value
      .map(t => t.section)
      .filter((section): section is string => section !== undefined);
    
    return Array.from(new Set(sections));
  }

  /* ================= RESET & REFRESH ================= */

  refreshTables(): void {
    const tables = this.generateInitialTables();
    this.tablesSubject.next(tables);
  }

  resetAllTables(): void {
    const tables = this.tablesSubject.value.map(table => ({
      ...table,
      status: 'available' as TableStatus,
      currentOrder: undefined,
      waiter: undefined,
      timeOccupied: undefined
    }));

    this.tablesSubject.next(tables);
    this.bookingsSubject.next([]);
  }

  /* ================= BULK OPERATIONS ================= */

  updateMultipleTables(updates: Array<{ tableId: number; status: TableStatus }>): boolean {
    const tables = [...this.tablesSubject.value];
    let allSuccessful = true;

    updates.forEach(update => {
      const tableIndex = tables.findIndex(t => t.id === update.tableId);
      
      if (tableIndex !== -1) {
        tables[tableIndex] = {
          ...tables[tableIndex],
          status: update.status
        };

        if (update.status === 'available') {
          tables[tableIndex].currentOrder = undefined;
          tables[tableIndex].waiter = undefined;
          tables[tableIndex].timeOccupied = undefined;
        }
      } else {
        allSuccessful = false;
      }
    });

    this.tablesSubject.next(tables);
    return allSuccessful;
  }

  /* ================= EXPORT DATA ================= */

  exportTablesData(): string {
    return JSON.stringify(this.tablesSubject.value, null, 2);
  }

  exportBookingsData(): string {
    return JSON.stringify(this.bookingsSubject.value, null, 2);
  }
}
