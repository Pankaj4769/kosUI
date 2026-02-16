// src/app/domains/pos/services/table.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  Table, 
  TableStatus, 
  TableBooking, 
  TableStats,
  AreaType,
  Reservation,
  LayoutPosition,
  ExtendedTableStats,
  TableHelpers
} from '../models/table.model';

/* ================= SERVICE ================= */

@Injectable({
  providedIn: 'root'
})
export class TableService {

  /* ================= STATE (PRESERVED + EXTENDED) ================= */

  // ✅ EXISTING: Core observables (PRESERVED)
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  public tables$ = this.tablesSubject.asObservable();

  private bookingsSubject = new BehaviorSubject<TableBooking[]>([]);
  public bookings$ = this.bookingsSubject.asObservable();

  private tableOrders = new Map<number, any>();

  // ✨ NEW: Additional observables for enhanced features
  private reservationsSubject = new BehaviorSubject<Reservation[]>([]);
  public reservations$: Observable<Reservation[]> = this.reservationsSubject.asObservable();

  private layoutPositions = new Map<number, {x: number, y: number}>();

  /* ================= CONSTRUCTOR (PRESERVED) ================= */

  constructor() {
    this.initializeTables();
    // ✨ NEW: Load additional data
    this.loadLayoutPositions();
    this.initializeReservations();
  }

  /* ================= INITIALIZATION (PRESERVED + ENHANCED) ================= */

  // ✅ EXISTING: Initialize tables (PRESERVED)
  private initializeTables(): void {
    const tables = this.generateInitialTables();
    this.tablesSubject.next(tables);
  }

  // ✅ EXISTING: Generate initial tables (PRESERVED + ENHANCED)
  private generateInitialTables(): Table[] {
    const now = new Date();

    return [
      // Section A (Tables 1-8)
      { id: 1, number: 1, name: 'Table 1', status: 'available', capacity: 4, section: 'A', position: { x: 0, y: 0 }, area: 'main-hall' },
      { id: 2, number: 2, name: 'Table 2', status: 'occupied', capacity: 2, section: 'A', position: { x: 1, y: 0 }, area: 'main-hall',
        currentOrder: 'ORD-2026-001', waiter: 'John Doe', timeOccupied: new Date(now.getTime() - 30 * 60000),
        startTime: new Date(now.getTime() - 30 * 60000), amount: 450 },
      { id: 3, number: 3, name: 'Table 3', status: 'available', capacity: 4, section: 'A', position: { x: 2, y: 0 }, area: 'main-hall' },
      { id: 4, number: 4, name: 'Table 4', status: 'available', capacity: 6, section: 'A', position: { x: 3, y: 0 }, area: 'main-hall' },
      { id: 5, number: 5, name: 'Table 5', status: 'reserved', capacity: 4, section: 'A', position: { x: 0, y: 1 }, area: 'main-hall' },
      { id: 6, number: 6, name: 'Table 6', status: 'occupied', capacity: 2, section: 'A', position: { x: 1, y: 1 }, area: 'main-hall',
        currentOrder: 'ORD-2026-002', waiter: 'Sarah Smith', timeOccupied: new Date(now.getTime() - 15 * 60000),
        startTime: new Date(now.getTime() - 15 * 60000), amount: 280 },
      { id: 7, number: 7, name: 'Table 7', status: 'available', capacity: 4, section: 'A', position: { x: 2, y: 1 }, area: 'main-hall' },
      { id: 8, number: 8, name: 'Table 8', status: 'cleaning', capacity: 8, section: 'A', position: { x: 3, y: 1 }, area: 'main-hall' },

      // Section B (Tables 9-16)
      { id: 9, number: 9, name: 'Table 9', status: 'available', capacity: 2, section: 'B', position: { x: 0, y: 2 }, area: 'terrace' },
      { id: 10, number: 10, name: 'Table 10', status: 'available', capacity: 4, section: 'B', position: { x: 1, y: 2 }, area: 'terrace' },
      { id: 11, number: 11, name: 'Table 11', status: 'occupied', capacity: 6, section: 'B', position: { x: 2, y: 2 }, area: 'terrace',
        currentOrder: 'ORD-2026-003', waiter: 'Mike Johnson', timeOccupied: new Date(now.getTime() - 45 * 60000),
        startTime: new Date(now.getTime() - 45 * 60000), amount: 680 },
      { id: 12, number: 12, name: 'Table 12', status: 'available', capacity: 4, section: 'B', position: { x: 3, y: 2 }, area: 'terrace' },
      { id: 13, number: 13, name: 'Table 13', status: 'available', capacity: 2, section: 'B', position: { x: 0, y: 3 }, area: 'terrace' },
      { id: 14, number: 14, name: 'Table 14', status: 'reserved', capacity: 4, section: 'B', position: { x: 1, y: 3 }, area: 'terrace' },
      { id: 15, number: 15, name: 'Table 15', status: 'available', capacity: 4, section: 'B', position: { x: 2, y: 3 }, area: 'terrace' },
      { id: 16, number: 16, name: 'Table 16', status: 'available', capacity: 6, section: 'B', position: { x: 3, y: 3 }, area: 'terrace' },

      // Section C (Tables 17-24)
      { id: 17, number: 17, name: 'Table 17', status: 'occupied', capacity: 4, section: 'C', position: { x: 0, y: 4 }, area: 'vip-lounge',
        currentOrder: 'ORD-2026-004', waiter: 'Emma Wilson', timeOccupied: new Date(now.getTime() - 20 * 60000),
        startTime: new Date(now.getTime() - 20 * 60000), amount: 520 },
      { id: 18, number: 18, name: 'Table 18', status: 'available', capacity: 2, section: 'C', position: { x: 1, y: 4 }, area: 'vip-lounge' },
      { id: 19, number: 19, name: 'Table 19', status: 'available', capacity: 4, section: 'C', position: { x: 2, y: 4 }, area: 'vip-lounge' },
      { id: 20, number: 20, name: 'Table 20', status: 'available', capacity: 8, section: 'C', position: { x: 3, y: 4 }, area: 'vip-lounge' },
      { id: 21, number: 21, name: 'Table 21', status: 'occupied', capacity: 4, section: 'C', position: { x: 0, y: 5 }, area: 'vip-lounge',
        currentOrder: 'ORD-2026-005', waiter: 'David Brown', timeOccupied: new Date(now.getTime() - 60 * 60000),
        startTime: new Date(now.getTime() - 60 * 60000), amount: 1200 },
      { id: 22, number: 22, name: 'Table 22', status: 'available', capacity: 2, section: 'C', position: { x: 1, y: 5 }, area: 'vip-lounge' },
      { id: 23, number: 23, name: 'Table 23', status: 'reserved', capacity: 6, section: 'C', position: { x: 2, y: 5 }, area: 'vip-lounge' },
      { id: 24, number: 24, name: 'Table 24', status: 'available', capacity: 4, section: 'C', position: { x: 3, y: 5 }, area: 'vip-lounge' },

      // VIP Section (Tables 25-28)
      { id: 25, number: 25, name: 'VIP Table 1', status: 'available', capacity: 8, section: 'VIP', position: { x: 0, y: 6 }, area: 'bar' },
      { id: 26, number: 26, name: 'VIP Table 2', status: 'occupied', capacity: 10, section: 'VIP', position: { x: 1, y: 6 }, area: 'bar',
        currentOrder: 'ORD-2026-006', waiter: 'Lisa Anderson', timeOccupied: new Date(now.getTime() - 90 * 60000),
        startTime: new Date(now.getTime() - 90 * 60000), amount: 2500 },
      { id: 27, number: 27, name: 'VIP Table 3', status: 'reserved', capacity: 6, section: 'VIP', position: { x: 2, y: 6 }, area: 'bar' },
      { id: 28, number: 28, name: 'VIP Table 4', status: 'available', capacity: 8, section: 'VIP', position: { x: 3, y: 6 }, area: 'bar' }
    ];
  }

  /* ================= GET TABLES (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Get all tables (PRESERVED)
  getTables(): Table[] {
    return this.tablesSubject.value;
  }

  // ✅ EXISTING: Get all table statuses (PRESERVED)
  getAllTableStatuses(): Table[] {
    return this.getTables();
  }

  // ✅ EXISTING: Get table by ID (PRESERVED)
  getTableById(id: number): Table | undefined {
    return this.tablesSubject.value.find(table => table.id === id);
  }

  // ✅ EXISTING: Get table by number (PRESERVED)
  getTableByNumber(number: number): Table | undefined {
    return this.tablesSubject.value.find(table => table.number === number);
  }

  // ✅ EXISTING: Get tables by section (PRESERVED)
  getTablesBySection(section: string): Table[] {
    return this.tablesSubject.value.filter(table => table.section === section);
  }

  // ✅ EXISTING: Get tables by status (PRESERVED)
  getTablesByStatus(status: TableStatus): Table[] {
    return this.tablesSubject.value.filter(table => table.status === status);
  }

  // ✅ EXISTING: Get available tables (PRESERVED)
  getAvailableTables(): Table[] {
    return this.getTablesByStatus('available');
  }

  // ✅ EXISTING: Get occupied tables (PRESERVED)
  getOccupiedTables(): Table[] {
    return this.getTablesByStatus('occupied');
  }

  // ✅ EXISTING: Get reserved tables (PRESERVED)
  getReservedTables(): Table[] {
    return this.getTablesByStatus('reserved');
  }

  /* ================= UPDATE TABLES (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Update table status (PRESERVED + ENHANCED)
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
      // ✨ ENHANCED: Also clear new fields
      updatedTable.startTime = undefined;
      updatedTable.amount = 0;
      updatedTable.serverName = undefined;
    }

    // ✨ ENHANCED: Set startTime when occupying
    if (status === 'occupied' && !updatedTable.startTime) {
      updatedTable.startTime = new Date();
      updatedTable.timeOccupied = new Date();
    }

    const updatedTables = [...tables];
    updatedTables[tableIndex] = updatedTable;

    this.tablesSubject.next(updatedTables);
    return true;
  }

  // ✅ EXISTING: Occupy table (PRESERVED)
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
      timeOccupied: new Date(),
      startTime: new Date(),
      serverName: waiter
    };

    const updatedTables = [...tables];
    updatedTables[tableIndex] = updatedTable;

    this.tablesSubject.next(updatedTables);
    return true;
  }

  // ✅ EXISTING: Release table (PRESERVED)
  releaseTable(tableId: number): boolean {
    return this.updateTableStatus(tableId, 'available');
  }

  // ✅ EXISTING: Reserve table (PRESERVED)
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

  // ✅ EXISTING: Set table cleaning (PRESERVED)
  setTableCleaning(tableId: number): boolean {
    return this.updateTableStatus(tableId, 'cleaning');
  }

  /* ================= ORDER MANAGEMENT (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Get order for table (PRESERVED)
  getOrderForTable(tableNumber: number): any | null {
    return this.tableOrders.get(tableNumber) || null;
  }

  // ✅ EXISTING: Set order for table (PRESERVED)
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

  // ✅ EXISTING: Clear table (PRESERVED)
  clearTable(tableNumber: number): void {
    this.tableOrders.delete(tableNumber);

    const table = this.getTableByNumber(tableNumber);
    if (table) {
      this.releaseTable(table.id);
    }
  }

  /* ================= TABLE STATISTICS (EXISTING METHOD PRESERVED) ================= */

  // ✅ EXISTING: Get table stats (PRESERVED)
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

  /* ================= TABLE BOOKINGS (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Get bookings (PRESERVED)
  getBookings(): TableBooking[] {
    return this.bookingsSubject.value;
  }

  // ✅ EXISTING: Add booking (PRESERVED)
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

  // ✅ EXISTING: Cancel booking (PRESERVED)
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

  // ✅ EXISTING: Get bookings by table (PRESERVED)
  getBookingsByTable(tableId: number): TableBooking[] {
    return this.bookingsSubject.value.filter(b => b.tableId === tableId);
  }

  // ✅ EXISTING: Generate booking ID (PRESERVED)
  private generateBookingId(): string {
    return `BKG-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /* ================= SEARCH & FILTER (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Search tables (PRESERVED)
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

  // ✅ EXISTING: Filter tables by capacity (PRESERVED)
  filterTablesByCapacity(minCapacity: number, maxCapacity?: number): Table[] {
    return this.tablesSubject.value.filter(table => {
      if (maxCapacity) {
        return table.capacity >= minCapacity && table.capacity <= maxCapacity;
      }
      return table.capacity >= minCapacity;
    });
  }

  /* ================= UTILITY METHODS (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Get time occupied (PRESERVED)
  getTimeOccupied(tableId: number): number | null {
    const table = this.getTableById(tableId);

    if (!table || !table.timeOccupied) {
      return null;
    }

    const now = new Date();
    return now.getTime() - table.timeOccupied.getTime();
  }

  // ✅ EXISTING: Get formatted time occupied (PRESERVED)
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

  // ✅ EXISTING: Is table available (PRESERVED)
  isTableAvailable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    return table?.status === 'available';
  }

  // ✅ EXISTING: Can reserve table (PRESERVED)
  canReserveTable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    return table?.status === 'available';
  }

  // ✅ EXISTING: Get section names (PRESERVED)
  getSectionNames(): string[] {
    const sections = this.tablesSubject.value
      .map(t => t.section)
      .filter((section): section is string => section !== undefined);

    return Array.from(new Set(sections));
  }

  /* ================= RESET & REFRESH (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Refresh tables (PRESERVED)
  refreshTables(): void {
    const tables = this.generateInitialTables();
    this.tablesSubject.next(tables);
  }

  // ✅ EXISTING: Reset all tables (PRESERVED)
  resetAllTables(): void {
    const tables = this.tablesSubject.value.map(table => ({
      ...table,
      status: 'available' as TableStatus,
      currentOrder: undefined,
      waiter: undefined,
      timeOccupied: undefined,
      startTime: undefined,
      amount: 0,
      serverName: undefined
    }));

    this.tablesSubject.next(tables);
    this.bookingsSubject.next([]);
  }

  /* ================= BULK OPERATIONS (EXISTING METHOD PRESERVED) ================= */

  // ✅ EXISTING: Update multiple tables (PRESERVED)
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
          tables[tableIndex].startTime = undefined;
          tables[tableIndex].amount = 0;
        }
      } else {
        allSuccessful = false;
      }
    });

    this.tablesSubject.next(tables);
    return allSuccessful;
  }

  /* ================= EXPORT DATA (ALL EXISTING METHODS PRESERVED) ================= */

  // ✅ EXISTING: Export tables data (PRESERVED)
  exportTablesData(): string {
    return JSON.stringify(this.tablesSubject.value, null, 2);
  }

  // ✅ EXISTING: Export bookings data (PRESERVED)
  exportBookingsData(): string {
    return JSON.stringify(this.bookingsSubject.value, null, 2);
  }

  /* ================= NEW METHODS - AREA MANAGEMENT ================= */

  // ✨ NEW: Get tables by area
  getTablesByArea(area: AreaType): Observable<Table[]> {
    return this.tables$.pipe(
      map(tables => tables.filter(t => {
        const tableArea = t.area || TableHelpers.mapSectionToArea(t.section);
        return tableArea === area;
      }))
    );
  }

  // ✨ NEW: Update table area
  updateTableArea(tableId: number, area: AreaType): void {
    const tables = this.tablesSubject.value;
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex !== -1) {
      const updatedTables = [...tables];
      updatedTables[tableIndex] = { ...updatedTables[tableIndex], area };
      this.tablesSubject.next(updatedTables);
    }
  }

  // ✨ NEW: Get area statistics
  getAreaStats(area: AreaType): Observable<{
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  }> {
    return this.getTablesByArea(area).pipe(
      map(tables => ({
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length
      }))
    );
  }

  /* ================= NEW METHODS - TABLE CRUD ================= */

  // ✨ NEW: Add new table
  addTable(table: Partial<Table>): void {
    const tables = this.tablesSubject.value;

    const maxId = tables.length > 0 ? Math.max(...tables.map(t => t.id)) : 0;
    const maxNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0;

    const newTable: Table = {
      id: table.id || maxId + 1,
      number: table.number || maxNumber + 1,
      name: table.name || `Table ${maxNumber + 1}`,
      status: table.status || 'available',
      capacity: table.capacity || 4,
      section: table.section,
      position: table.position,
      area: table.area || 'main-hall',
      amount: 0
    };

    const updatedTables = [...tables, newTable];
    this.tablesSubject.next(updatedTables);

    console.log(`Table ${newTable.id} added successfully`);
  }

  // ✨ NEW: Remove table
  removeTable(tableId: number): void {
    const tables = this.tablesSubject.value;
    const table = tables.find(t => t.id === tableId);

    if (table && table.status === 'available') {
      const updatedTables = tables.filter(t => t.id !== tableId);
      this.tablesSubject.next(updatedTables);
      console.log(`Table ${tableId} removed successfully`);
    } else {
      console.warn(`Cannot remove table ${tableId} - table is not available`);
    }
  }

  // ✨ NEW: Update table capacity
  updateTableCapacity(tableId: number, capacity: number): void {
    const tables = this.tablesSubject.value;
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex !== -1) {
      const updatedTables = [...tables];
      updatedTables[tableIndex] = { ...updatedTables[tableIndex], capacity };
      this.tablesSubject.next(updatedTables);
    }
  }

  // ✨ NEW: Update table amount
  updateTableAmount(tableId: number, amount: number): void {
    const tables = this.tablesSubject.value;
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex !== -1) {
      const updatedTables = [...tables];
      updatedTables[tableIndex] = { ...updatedTables[tableIndex], amount };
      this.tablesSubject.next(updatedTables);
    }
  }

  /* ================= NEW METHODS - LAYOUT MANAGEMENT ================= */

  // ✨ NEW: Update table position
  updateTablePosition(tableId: number, position: {x: number, y: number}): void {
    const tables = this.tablesSubject.value;
    const tableIndex = tables.findIndex(t => t.id === tableId);

    if (tableIndex !== -1) {
      const updatedTables = [...tables];
      updatedTables[tableIndex] = { ...updatedTables[tableIndex], position };
      this.tablesSubject.next(updatedTables);

      this.layoutPositions.set(tableId, position);
      this.saveLayoutPositions();
    }
  }

  // ✨ NEW: Get table position
  getTablePosition(tableId: number): {x: number, y: number} | undefined {
    return this.layoutPositions.get(tableId);
  }

  // ✨ NEW: Save layout positions to localStorage
  private saveLayoutPositions(): void {
    const positions: LayoutPosition[] = [];
    this.layoutPositions.forEach((pos, tableId) => {
      positions.push({ tableId, x: pos.x, y: pos.y });
    });
    localStorage.setItem('tableLayoutPositions', JSON.stringify(positions));
  }

  // ✨ NEW: Load layout positions from localStorage
  private loadLayoutPositions(): void {
    const saved = localStorage.getItem('tableLayoutPositions');
    if (saved) {
      try {
        const positions: LayoutPosition[] = JSON.parse(saved);
        positions.forEach(pos => {
          this.layoutPositions.set(pos.tableId, { x: pos.x, y: pos.y });
        });
      } catch (e) {
        console.error('Failed to load layout positions', e);
      }
    }
  }

  // ✨ NEW: Reset layout to default
  resetLayout(): void {
    this.layoutPositions.clear();
    localStorage.removeItem('tableLayoutPositions');

    const tables = this.tablesSubject.value.map(t => {
      const updated = {...t};
      // Keep original positions from generateInitialTables
      return updated;
    });
    this.tablesSubject.next(tables);
  }

  /* ================= NEW METHODS - RESERVATIONS ================= */

  // ✨ NEW: Initialize reservations
  private initializeReservations(): void {
    const mockReservations: Reservation[] = [
      {
        id: 1,
        tableNumber: 12,
        tableId: 12,
        customerName: 'Robert Fox',
        phoneNumber: '+91-9876543210',
        guests: 4,
        date: new Date().toISOString().split('T')[0],
        time: '19:30',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        tableNumber: 3,
        tableId: 3,
        customerName: 'Jane Cooper',
        phoneNumber: '+91-9876543211',
        guests: 2,
        date: new Date().toISOString().split('T')[0],
        time: '20:00',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      }
    ];

    this.reservationsSubject.next(mockReservations);
  }

  // ✨ NEW: Get all reservations
  getReservations(): Observable<Reservation[]> {
    return this.reservations$;
  }

  // ✨ NEW: Get upcoming reservations
  getUpcomingReservations(): Observable<Reservation[]> {
    return this.reservations$.pipe(
      map(reservations => {
        const now = new Date();
        return reservations
          .filter(r => r.status === 'confirmed' || r.status === 'pending')
          .filter(r => {
            const resDate = new Date(r.date + ' ' + r.time);
            return resDate >= now;
          })
          .sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.time);
            const dateB = new Date(b.date + ' ' + b.time);
            return dateA.getTime() - dateB.getTime();
          });
      })
    );
  }

  // ✨ NEW: Add reservation
  addReservation(reservation: Omit<Reservation, 'id' | 'createdAt'>): void {
    const reservations = this.reservationsSubject.value;
    const maxId = reservations.length > 0 ? Math.max(...reservations.map(r => r.id)) : 0;

    const newReservation: Reservation = {
      ...reservation,
      id: maxId + 1,
      createdAt: new Date().toISOString()
    };

    this.reservationsSubject.next([...reservations, newReservation]);
    this.updateTableStatus(reservation.tableId, 'reserved');
  }

  // ✨ NEW: Mark reservation as arrived
  markReservationArrived(reservationId: number): void {
    const reservations = this.reservationsSubject.value;
    const resIndex = reservations.findIndex(r => r.id === reservationId);

    if (resIndex !== -1) {
      const updatedReservations = [...reservations];
      updatedReservations[resIndex] = {
        ...updatedReservations[resIndex],
        status: 'arrived'
      };
      this.reservationsSubject.next(updatedReservations);

      const tableId = updatedReservations[resIndex].tableId;
      this.updateTableStatus(tableId, 'occupied');
    }
  }

  // ✨ NEW: Cancel reservation
  cancelReservation(reservationId: number): void {
    const reservations = this.reservationsSubject.value;
    const resIndex = reservations.findIndex(r => r.id === reservationId);

    if (resIndex !== -1) {
      const updatedReservations = [...reservations];
      const tableId = updatedReservations[resIndex].tableId;

      updatedReservations[resIndex] = {
        ...updatedReservations[resIndex],
        status: 'cancelled'
      };
      this.reservationsSubject.next(updatedReservations);
      this.updateTableStatus(tableId, 'available');
    }
  }

  /* ================= NEW METHODS - EXTENDED STATISTICS ================= */

  // ✨ NEW: Get extended statistics with revenue
  getExtendedStats(): Observable<ExtendedTableStats> {
    return this.tables$.pipe(
      map(tables => {
        const baseStats = this.getTableStats();
        const revenue = tables.reduce((sum, t) => sum + (t.amount || 0), 0);
        const occupiedTables = tables.filter(t => t.status === 'occupied');

        let avgSessionTime = 0;
        if (occupiedTables.length > 0) {
          const totalTime = occupiedTables.reduce((sum, t) => {
            if (t.startTime || t.timeOccupied) {
              const duration = TableHelpers.calculateSessionDuration(t.startTime || t.timeOccupied!);
              return sum + duration;
            }
            return sum;
          }, 0);
          avgSessionTime = Math.round(totalTime / occupiedTables.length);
        }

        return {
          ...baseStats,
          dirty: baseStats.cleaning,
          pending: baseStats.occupied + baseStats.reserved,
          revenue,
          avgSessionTime
        };
      })
    );
  }

  // ✨ NEW: Get statistics by area
  getStatisticsByArea(): Observable<Map<AreaType, ExtendedTableStats>> {
    return this.tables$.pipe(
      map(tables => {
        const areaStats = new Map<AreaType, ExtendedTableStats>();
        const areas: AreaType[] = ['main-hall', 'terrace', 'vip-lounge', 'bar'];

        areas.forEach(area => {
          const areaTables = tables.filter(t => {
            const tableArea = t.area || TableHelpers.mapSectionToArea(t.section);
            return tableArea === area;
          });

          const total = areaTables.length;
          const available = areaTables.filter(t => t.status === 'available').length;
          const occupied = areaTables.filter(t => t.status === 'occupied').length;
          const reserved = areaTables.filter(t => t.status === 'reserved').length;
          const cleaning = areaTables.filter(t => t.status === 'cleaning').length;
          const revenue = areaTables.reduce((sum, t) => sum + (t.amount || 0), 0);

          areaStats.set(area, {
            total,
            available,
            occupied,
            reserved,
            cleaning,
            dirty: cleaning,
            pending: occupied + reserved,
            revenue,
            occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0
          });
        });

        return areaStats;
      })
    );
  }

  /* ================= NEW UTILITY METHODS ================= */

  // ✨ NEW: Find suitable table for guests
  findSuitableTable(guestCount: number, preferredArea?: AreaType): Table | undefined {
    let availableTables = this.tablesSubject.value
      .filter(t => t.status === 'available')
      .filter(t => t.capacity >= guestCount);

    if (preferredArea) {
      const areaFiltered = availableTables.filter(t => {
        const tableArea = t.area || TableHelpers.mapSectionToArea(t.section);
        return tableArea === preferredArea;
      });

      if (areaFiltered.length > 0) {
        availableTables = areaFiltered;
      }
    }

    return availableTables.sort((a, b) => a.capacity - b.capacity)[0];
  }

  // ✨ NEW: Get table count by status
  getTableCountByStatus(status: TableStatus): number {
    return this.tablesSubject.value.filter(t => t.status === status).length;
  }

  // ✨ NEW: Import table data
  importTableData(jsonData: string): void {
    try {
      const tables: Table[] = JSON.parse(jsonData);
      this.tablesSubject.next(tables);
      console.log('Table data imported successfully');
    } catch (e) {
      console.error('Failed to import table data', e);
    }
  }
}