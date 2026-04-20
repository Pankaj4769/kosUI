// src/app/domains/pos/services/table.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Table,
  TableStatus,
  TableBooking,
  TableStats,
  AreaType,
  Reservation,
  WaitlistEntry,
  LayoutPosition,
  ExtendedTableStats,
  TableHelpers
} from '../models/table.model';
import { BASE_URL } from '../../../apiUrls';
import { AuthService } from '../../../core/auth/auth.service';

/* ── Backend response shapes ── */
interface BackendTable {
  id: number;
  tableNumber: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  areaName?: string;
  orderNumber?: string;
  waiter?: string;
  startTime?: string;
  restaurantId: string;
}

interface BackendReservation {
  id: number;
  tableId: number;
  tableNumber?: number;
  customerName: string;
  customerPhone?: string;
  partySize?: number;
  reservationDate: string;
  reservationTime: string;
  status: 'UPCOMING' | 'CONFIRMED' | 'PENDING' | 'ARRIVED' | 'NO_SHOW' | 'CANCELLED';
  restaurantId: string;
  createdAt?: string;
}

/* ── Status mapping helpers ── */
function toFrontendStatus(s: BackendTable['status']): TableStatus {
  return s.toLowerCase() as TableStatus;
}

function toBackendStatus(s: TableStatus): string {
  return s.toUpperCase();
}

function toFrontendResStatus(s: BackendReservation['status']): Reservation['status'] {
  const map: Record<string, Reservation['status']> = {
    UPCOMING: 'confirmed',
    CONFIRMED: 'confirmed',
    PENDING: 'pending',
    ARRIVED: 'arrived',
    NO_SHOW: 'no-show',
    CANCELLED: 'cancelled'
  };
  return map[s] ?? 'pending';
}

function toBackendResStatus(s: Reservation['status']): string {
  const map: Record<string, string> = {
    confirmed: 'CONFIRMED',
    pending: 'PENDING',
    arrived: 'ARRIVED',
    'no-show': 'NO_SHOW',
    cancelled: 'CANCELLED'
  };
  return map[s] ?? 'PENDING';
}

function mapBackendTable(b: BackendTable): Table {
  const startTime = b.startTime ? new Date(b.startTime) : undefined;
  return {
    id: b.id,
    number: b.tableNumber,
    name: `Table ${b.tableNumber}`,
    status: toFrontendStatus(b.status),
    capacity: b.capacity,
    area: (b.areaName as AreaType) || 'main-hall',
    currentOrder: b.orderNumber,
    waiter: b.waiter,
    startTime,
    timeOccupied: startTime,
    amount: 0
  };
}

function mapBackendReservation(b: BackendReservation): Reservation {
  return {
    id: b.id,
    tableId: b.tableId,
    tableNumber: b.tableNumber ?? 0,
    customerName: b.customerName,
    phoneNumber: b.customerPhone ?? '',
    guests: b.partySize ?? 1,
    date: b.reservationDate,
    time: b.reservationTime,
    status: toFrontendResStatus(b.status),
    createdAt: b.createdAt ?? new Date().toISOString(),
    source: 'phone'
  };
}

/* ================= SERVICE ================= */

@Injectable({
  providedIn: 'root'
})
export class TableService {

  private readonly baseUrl = BASE_URL;

  /* ── State ── */
  private tablesSubject = new BehaviorSubject<Table[]>([]);
  public tables$ = this.tablesSubject.asObservable();

  private bookingsSubject = new BehaviorSubject<TableBooking[]>([]);
  public bookings$ = this.bookingsSubject.asObservable();

  private tableOrders = new Map<number, any>();

  private reservationsSubject = new BehaviorSubject<Reservation[]>([]);
  public reservations$: Observable<Reservation[]> = this.reservationsSubject.asObservable();

  private layoutPositions = new Map<number, {x: number, y: number}>();

  /* ── Waitlist (no backend yet, kept as local state) ── */
  private waitlistSubject = new BehaviorSubject<WaitlistEntry[]>([]);
  public waitlist$ = this.waitlistSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.loadLayoutPositions();
    this.loadTables();
    this.loadReservations();
  }

  /* ── Helpers ── */
  private get restaurantId(): string {
    return this.authService.currentUser?.restaurantId ?? '';
  }

  /* ================= LOAD FROM BACKEND ================= */

  private loadTables(): void {
    const restId = this.restaurantId;
    if (!restId) return;
    this.http.get<BackendTable[]>(`${this.baseUrl}/api/tables/${restId}`)
      .subscribe({
        next: tables => this.tablesSubject.next(tables.map(mapBackendTable)),
        error: err => console.error('Failed to load tables', err)
      });
  }

  private loadReservations(): void {
    const restId = this.restaurantId;
    if (!restId) return;
    this.http.get<BackendReservation[]>(`${this.baseUrl}/api/reservations/${restId}`)
      .subscribe({
        next: reservations => this.reservationsSubject.next(reservations.map(mapBackendReservation)),
        error: err => console.error('Failed to load reservations', err)
      });
  }

  /* ================= GET TABLES ================= */

  getTables(): Table[] {
    return this.tablesSubject.value;
  }

  getAllTableStatuses(): Table[] {
    return this.getTables();
  }

  getTableById(id: number): Table | undefined {
    return this.tablesSubject.value.find(t => t.id === id);
  }

  getTableByNumber(number: number): Table | undefined {
    return this.tablesSubject.value.find(t => t.number === number);
  }

  getTablesBySection(section: string): Table[] {
    return this.tablesSubject.value.filter(t => t.section === section);
  }

  getTablesByStatus(status: TableStatus): Table[] {
    return this.tablesSubject.value.filter(t => t.status === status);
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
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return false;

    // Optimistic local update
    const updatedTable = { ...tables[idx], status };
    if (status === 'available') {
      updatedTable.currentOrder = undefined;
      updatedTable.waiter = undefined;
      updatedTable.timeOccupied = undefined;
      updatedTable.startTime = undefined;
      updatedTable.amount = 0;
      updatedTable.serverName = undefined;
    }
    if (status === 'occupied' && !updatedTable.startTime) {
      updatedTable.startTime = new Date();
      updatedTable.timeOccupied = new Date();
    }
    const updated = [...tables];
    updated[idx] = updatedTable;
    this.tablesSubject.next(updated);

    // Persist to backend
    this.http.put(`${this.baseUrl}/api/tables/${tableId}/status`, { status: toBackendStatus(status) })
      .subscribe({ error: err => console.error('updateTableStatus failed', err) });

    return true;
  }

  occupyTable(tableId: number, orderNumber: string, waiter: string): boolean {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return false;
    if (tables[idx].status === 'occupied') return false;

    // Optimistic update
    const now = new Date();
    const updatedTable: Table = {
      ...tables[idx],
      status: 'occupied',
      currentOrder: orderNumber,
      waiter,
      timeOccupied: now,
      startTime: now,
      serverName: waiter
    };
    const updated = [...tables];
    updated[idx] = updatedTable;
    this.tablesSubject.next(updated);

    // Backend call
    this.http.put(`${this.baseUrl}/api/tables/${tableId}/occupy`, {
      orderNumber,
      waiter,
      startTime: now.toISOString()
    }).subscribe({ error: err => console.error('occupyTable failed', err) });

    return true;
  }

  releaseTable(tableId: number): boolean {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return false;

    // Optimistic update
    const updated = [...tables];
    updated[idx] = {
      ...updated[idx],
      status: 'available',
      currentOrder: undefined,
      waiter: undefined,
      timeOccupied: undefined,
      startTime: undefined,
      amount: 0,
      serverName: undefined
    };
    this.tablesSubject.next(updated);

    // Backend call
    this.http.put(`${this.baseUrl}/api/tables/${tableId}/release`, {})
      .subscribe({ error: err => console.error('releaseTable failed', err) });

    return true;
  }

  reserveTable(tableId: number): boolean {
    const table = this.getTableById(tableId);
    if (!table || table.status !== 'available') return false;
    return this.updateTableStatus(tableId, 'reserved');
  }

  setTableCleaning(tableId: number): boolean {
    return this.updateTableStatus(tableId, 'cleaning');
  }

  // Assign or reassign a waiter to an already-occupied table
  assignWaiter(tableId: number, waiter: string): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return;

    // Optimistic update
    const updated = [...tables];
    updated[idx] = { ...updated[idx], waiter, serverName: waiter };
    this.tablesSubject.next(updated);

    // Persist — reuse the occupy endpoint which accepts waiter updates
    const table = updated[idx];
    this.http.put(`${this.baseUrl}/api/tables/${tableId}/occupy`, {
      orderNumber: table.currentOrder,
      waiter,
      startTime: table.startTime ? new Date(table.startTime).toISOString() : new Date().toISOString()
    }).subscribe({ error: err => console.error('assignWaiter failed', err) });
  }

  /* ================= TABLE CRUD ================= */

  addTable(table: Partial<Table>): void {
    const restId = this.restaurantId;
    const tables = this.tablesSubject.value;
    const maxNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0;
    const tableNumber = table.number ?? (maxNumber + 1);

    const payload = {
      tableNumber,
      capacity: table.capacity ?? 4,
      areaName: table.area ?? 'main-hall',
      status: 'AVAILABLE',
      restaurantId: restId
    };

    this.http.post<BackendTable>(`${this.baseUrl}/api/tables`, payload)
      .subscribe({
        next: saved => {
          const mapped = mapBackendTable(saved);
          this.tablesSubject.next([...this.tablesSubject.value, mapped]);
        },
        error: err => console.error('addTable failed', err)
      });
  }

  removeTable(tableId: number): void {
    const table = this.getTableById(tableId);
    if (!table || table.status !== 'available') {
      console.warn(`Cannot remove table ${tableId} - not available`);
      return;
    }

    // Optimistic
    this.tablesSubject.next(this.tablesSubject.value.filter(t => t.id !== tableId));

    this.http.delete(`${this.baseUrl}/api/tables/${tableId}`)
      .subscribe({ error: err => {
        console.error('removeTable failed', err);
        this.loadTables(); // rollback by reloading
      }});
  }

  updateTableArea(tableId: number, area: AreaType): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return;

    const updated = [...tables];
    updated[idx] = { ...updated[idx], area };
    this.tablesSubject.next(updated);

    this.http.put(`${this.baseUrl}/api/tables/${tableId}/area`, { areaName: area })
      .subscribe({ error: err => console.error('updateTableArea failed', err) });
  }

  updateTableCapacity(tableId: number, capacity: number): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx !== -1) {
      const updated = [...tables];
      updated[idx] = { ...updated[idx], capacity };
      this.tablesSubject.next(updated);
    }
  }

  updateTableAmount(tableId: number, amount: number): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx !== -1) {
      const updated = [...tables];
      updated[idx] = { ...updated[idx], amount };
      this.tablesSubject.next(updated);
    }
  }

  updateTableOrderInfo(tableId: number, itemCount: number, totalAmount: number): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return;
    const updated = [...tables];
    updated[idx] = { ...updated[idx], itemCount, totalAmount };
    this.tablesSubject.next(updated);
  }

  /* ================= BULK OPERATIONS ================= */

  updateMultipleTables(updates: Array<{ tableId: number; status: TableStatus }>): boolean {
    const tables = [...this.tablesSubject.value];
    updates.forEach(u => {
      const idx = tables.findIndex(t => t.id === u.tableId);
      if (idx !== -1) {
        tables[idx] = { ...tables[idx], status: u.status };
        if (u.status === 'available') {
          tables[idx].currentOrder = undefined;
          tables[idx].waiter = undefined;
          tables[idx].timeOccupied = undefined;
          tables[idx].startTime = undefined;
          tables[idx].amount = 0;
        }
      }
    });
    this.tablesSubject.next(tables);

    this.http.put(`${this.baseUrl}/api/tables/bulk-status`, {
      tableIds: updates.map(u => u.tableId),
      status: toBackendStatus(updates[0]?.status ?? 'available')
    }).subscribe({ error: err => console.error('bulkUpdateStatus failed', err) });

    return true;
  }

  /* ================= ORDER MANAGEMENT ================= */

  getOrderForTable(tableNumber: number): any | null {
    return this.tableOrders.get(tableNumber) || null;
  }

  setOrderForTable(tableNumber: number, orderData: any): void {
    this.tableOrders.set(tableNumber, orderData);
    const table = this.getTableByNumber(tableNumber);
    if (table && orderData) {
      this.occupyTable(table.id, orderData.orderNumber || `ORD-${Date.now()}`, orderData.waiter || 'Staff');
    }
  }

  clearTable(tableNumber: number): void {
    this.tableOrders.delete(tableNumber);
    const table = this.getTableByNumber(tableNumber);
    if (table) {
      this.releaseTable(table.id);
    }
  }

  requestBill(tableId: number): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return;
    const updated = [...tables];
    updated[idx] = { ...updated[idx], billRequested: true };
    this.tablesSubject.next(updated);
  }

  clearBillRequest(tableId: number): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx === -1) return;
    const updated = [...tables];
    updated[idx] = { ...updated[idx], billRequested: false };
    this.tablesSubject.next(updated);
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
    return { total, available, occupied, reserved, cleaning, occupancyRate: Math.round(occupancyRate * 10) / 10 };
  }

  /* ================= TABLE BOOKINGS ================= */

  getBookings(): TableBooking[] {
    return this.bookingsSubject.value;
  }

  addBooking(booking: Omit<TableBooking, 'id'>): string {
    const newBooking: TableBooking = { ...booking, id: this.generateBookingId() };
    this.bookingsSubject.next([...this.bookingsSubject.value, newBooking]);
    this.reserveTable(booking.tableId);
    return newBooking.id;
  }

  cancelBooking(bookingId: string): boolean {
    const bookings = this.bookingsSubject.value;
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return false;
    this.releaseTable(booking.tableId);
    this.bookingsSubject.next(bookings.filter(b => b.id !== bookingId));
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
    const q = query.toLowerCase();
    return this.tablesSubject.value.filter(t =>
      t.number.toString().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.section?.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q) ||
      t.capacity.toString().includes(q) ||
      t.waiter?.toLowerCase().includes(q) ||
      t.currentOrder?.toLowerCase().includes(q)
    );
  }

  filterTablesByCapacity(minCapacity: number, maxCapacity?: number): Table[] {
    return this.tablesSubject.value.filter(t =>
      maxCapacity ? t.capacity >= minCapacity && t.capacity <= maxCapacity : t.capacity >= minCapacity
    );
  }

  /* ================= UTILITY METHODS ================= */

  getTimeOccupied(tableId: number): number | null {
    const table = this.getTableById(tableId);
    if (!table || !table.timeOccupied) return null;
    return new Date().getTime() - new Date(table.timeOccupied).getTime();
  }

  getFormattedTimeOccupied(tableId: number): string {
    const time = this.getTimeOccupied(tableId);
    if (!time) return '';
    const minutes = Math.floor(time / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  isTableAvailable(tableId: number): boolean {
    return this.getTableById(tableId)?.status === 'available';
  }

  canReserveTable(tableId: number): boolean {
    return this.getTableById(tableId)?.status === 'available';
  }

  getSectionNames(): string[] {
    const sections = this.tablesSubject.value
      .map(t => t.section)
      .filter((s): s is string => s !== undefined);
    return Array.from(new Set(sections));
  }

  findSuitableTable(guestCount: number, preferredArea?: AreaType): Table | undefined {
    let available = this.tablesSubject.value
      .filter(t => t.status === 'available' && t.capacity >= guestCount);
    if (preferredArea) {
      const areaFiltered = available.filter(t => {
        const a = t.area || TableHelpers.mapSectionToArea(t.section);
        return a === preferredArea;
      });
      if (areaFiltered.length > 0) available = areaFiltered;
    }
    return available.sort((a, b) => a.capacity - b.capacity)[0];
  }

  getTableCountByStatus(status: TableStatus): number {
    return this.tablesSubject.value.filter(t => t.status === status).length;
  }

  /* ================= RESET & REFRESH ================= */

  refreshTables(): void {
    this.loadTables();
  }

  resetAllTables(): void {
    const tables = this.tablesSubject.value.map(t => ({
      ...t, status: 'available' as TableStatus,
      currentOrder: undefined, waiter: undefined,
      timeOccupied: undefined, startTime: undefined,
      amount: 0, serverName: undefined
    }));
    this.tablesSubject.next(tables);
    this.bookingsSubject.next([]);
  }

  /* ================= AREA MANAGEMENT ================= */

  getTablesByArea(area: AreaType): Observable<Table[]> {
    return this.tables$.pipe(
      map(tables => tables.filter(t => {
        const a = t.area || TableHelpers.mapSectionToArea(t.section);
        return a === area;
      }))
    );
  }

  getAreaStats(area: AreaType): Observable<{ total: number; available: number; occupied: number; reserved: number; }> {
    return this.getTablesByArea(area).pipe(
      map(tables => ({
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length
      }))
    );
  }

  /* ================= LAYOUT MANAGEMENT ================= */

  updateTablePosition(tableId: number, position: {x: number, y: number}): void {
    const tables = this.tablesSubject.value;
    const idx = tables.findIndex(t => t.id === tableId);
    if (idx !== -1) {
      const updated = [...tables];
      updated[idx] = { ...updated[idx], position };
      this.tablesSubject.next(updated);
      this.layoutPositions.set(tableId, position);
      this.saveLayoutPositions();
    }
  }

  getTablePosition(tableId: number): {x: number, y: number} | undefined {
    return this.layoutPositions.get(tableId);
  }

  private saveLayoutPositions(): void {
    const positions: LayoutPosition[] = [];
    this.layoutPositions.forEach((pos, tableId) => positions.push({ tableId, x: pos.x, y: pos.y }));
    localStorage.setItem('tableLayoutPositions', JSON.stringify(positions));
  }

  private loadLayoutPositions(): void {
    const saved = localStorage.getItem('tableLayoutPositions');
    if (saved) {
      try {
        const positions: LayoutPosition[] = JSON.parse(saved);
        positions.forEach(pos => this.layoutPositions.set(pos.tableId, { x: pos.x, y: pos.y }));
      } catch (e) {
        console.error('Failed to load layout positions', e);
      }
    }
  }

  resetLayout(): void {
    this.layoutPositions.clear();
    localStorage.removeItem('tableLayoutPositions');
  }

  /* ================= RESERVATIONS ================= */

  getReservations(): Observable<Reservation[]> {
    return this.reservations$;
  }

  getUpcomingReservations(): Observable<Reservation[]> {
    return this.reservations$.pipe(
      map(reservations => {
        const now = new Date();
        return reservations
          .filter(r => r.status === 'confirmed' || r.status === 'pending')
          .filter(r => new Date(r.date + ' ' + r.time) >= now)
          .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());
      })
    );
  }

  addReservation(reservation: Omit<Reservation, 'id' | 'createdAt'>): void {
    const restId = this.restaurantId;
    const payload = {
      tableId: reservation.tableId,
      tableNumber: reservation.tableNumber,
      customerName: reservation.customerName,
      customerPhone: reservation.phoneNumber,
      partySize: reservation.guests,
      reservationDate: reservation.date,
      reservationTime: reservation.time,
      status: toBackendResStatus(reservation.status),
      restaurantId: restId
    };

    this.http.post<BackendReservation>(`${this.baseUrl}/api/reservations`, payload)
      .subscribe({
        next: saved => {
          const mapped = mapBackendReservation(saved);
          this.reservationsSubject.next([...this.reservationsSubject.value, mapped]);
          this.updateTableStatus(reservation.tableId, 'reserved');
        },
        error: err => console.error('addReservation failed', err)
      });
  }

  markReservationArrived(reservationId: number): void {
    this.http.patch<BackendReservation>(`${this.baseUrl}/api/reservations/${reservationId}/arrived`, {})
      .subscribe({
        next: saved => {
          this._patchLocalReservation(reservationId, { status: 'arrived' });
          this.updateTableStatus(saved.tableId, 'occupied');
        },
        error: err => console.error('markReservationArrived failed', err)
      });
  }

  cancelReservation(reservationId: number): void {
    this.http.delete(`${this.baseUrl}/api/reservations/${reservationId}`)
      .subscribe({
        next: () => {
          const res = this.reservationsSubject.value.find(r => r.id === reservationId);
          if (res) {
            this._patchLocalReservation(reservationId, { status: 'cancelled' });
            this.updateTableStatus(res.tableId, 'available');
          }
        },
        error: err => console.error('cancelReservation failed', err)
      });
  }

  confirmReservation(reservationId: number): void {
    this.http.patch<BackendReservation>(`${this.baseUrl}/api/reservations/${reservationId}/status`,
      { status: 'CONFIRMED' })
      .subscribe({
        next: () => this._patchLocalReservation(reservationId, { status: 'confirmed' }),
        error: err => console.error('confirmReservation failed', err)
      });
  }

  markNoShow(reservationId: number): void {
    const res = this.reservationsSubject.value.find(r => r.id === reservationId);
    this.http.patch<BackendReservation>(`${this.baseUrl}/api/reservations/${reservationId}/status`,
      { status: 'NO_SHOW' })
      .subscribe({
        next: () => {
          this._patchLocalReservation(reservationId, { status: 'no-show' });
          if (res) this.updateTableStatus(res.tableId, 'available');
        },
        error: err => console.error('markNoShow failed', err)
      });
  }

  updateReservation(reservationId: number, changes: Partial<Reservation>): void {
    this._patchLocalReservation(reservationId, changes);
    if (changes.status) {
      this.http.patch(`${this.baseUrl}/api/reservations/${reservationId}/status`,
        { status: toBackendResStatus(changes.status) })
        .subscribe({ error: err => console.error('updateReservation failed', err) });
    }
  }

  private _patchLocalReservation(id: number, changes: Partial<Reservation>): void {
    const reservations = this.reservationsSubject.value;
    const idx = reservations.findIndex(r => r.id === id);
    if (idx !== -1) {
      const updated = [...reservations];
      updated[idx] = { ...updated[idx], ...changes };
      this.reservationsSubject.next(updated);
    }
  }

  /* ================= EXTENDED STATISTICS ================= */

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
              return sum + TableHelpers.calculateSessionDuration(t.startTime || t.timeOccupied!);
            }
            return sum;
          }, 0);
          avgSessionTime = Math.round(totalTime / occupiedTables.length);
        }
        return { ...baseStats, dirty: baseStats.cleaning, pending: baseStats.occupied + baseStats.reserved, revenue, avgSessionTime };
      })
    );
  }

  getStatisticsByArea(): Observable<Map<AreaType, ExtendedTableStats>> {
    return this.tables$.pipe(
      map(tables => {
        const areaStats = new Map<AreaType, ExtendedTableStats>();
        const areas: AreaType[] = ['main-hall', 'terrace', 'vip-lounge', 'bar'];
        areas.forEach(area => {
          const areaTables = tables.filter(t => (t.area || TableHelpers.mapSectionToArea(t.section)) === area);
          const total = areaTables.length;
          const available = areaTables.filter(t => t.status === 'available').length;
          const occupied = areaTables.filter(t => t.status === 'occupied').length;
          const reserved = areaTables.filter(t => t.status === 'reserved').length;
          const cleaning = areaTables.filter(t => t.status === 'cleaning').length;
          const revenue = areaTables.reduce((sum, t) => sum + (t.amount || 0), 0);
          areaStats.set(area, {
            total, available, occupied, reserved, cleaning,
            dirty: cleaning, pending: occupied + reserved, revenue,
            occupancyRate: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0
          });
        });
        return areaStats;
      })
    );
  }

  /* ================= EXPORT ================= */

  exportTablesData(): string {
    return JSON.stringify(this.tablesSubject.value, null, 2);
  }

  exportBookingsData(): string {
    return JSON.stringify(this.bookingsSubject.value, null, 2);
  }

  importTableData(jsonData: string): void {
    try {
      this.tablesSubject.next(JSON.parse(jsonData));
    } catch (e) {
      console.error('Failed to import table data', e);
    }
  }

  /* ================= WAITLIST (local only) ================= */

  getWaitlist(): Observable<WaitlistEntry[]> {
    return this.waitlist$;
  }

  addToWaitlist(entry: Omit<WaitlistEntry, 'id' | 'addedAt' | 'status'>): void {
    const list = this.waitlistSubject.value;
    const maxId = list.length > 0 ? Math.max(...list.map(e => e.id)) : 0;
    this.waitlistSubject.next([...list, { ...entry, id: maxId + 1, addedAt: new Date(), status: 'waiting' }]);
  }

  seatWaitlistEntry(entryId: number): void {
    const list = this.waitlistSubject.value;
    const idx = list.findIndex(e => e.id === entryId);
    if (idx !== -1) {
      const updated = [...list];
      updated[idx] = { ...updated[idx], status: 'seated' };
      this.waitlistSubject.next(updated);
    }
  }

  removeWaitlistEntry(entryId: number): void {
    this.waitlistSubject.next(this.waitlistSubject.value.filter(e => e.id !== entryId));
  }
}
