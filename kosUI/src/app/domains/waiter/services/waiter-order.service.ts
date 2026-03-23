import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Table } from '../../pos/models/table.model';
import { TableService } from '../../pos/services/table.service';
import { InventoryService } from '../../dashboard/services/inventory.service';

export interface WaiterMenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  group: 'Veg' | 'Non-Veg';
  description: string;
  image?: string;
  available: boolean;
  popular?: boolean;
}

export interface WaiterOrderItem {
  menuItemId: number;
  name: string;
  price: number;
  qty: number;
  note: string;
  category: string;
  group: 'Veg' | 'Non-Veg';
}

export interface TableOrder {
  tableId: number;
  items: WaiterOrderItem[];
  note: string;
  kotSent: boolean;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class WaiterOrderService {

  constructor(
    private tableSvc: TableService,
    private inventorySvc: InventoryService,
  ) {}

  // ── Public accessors ────────────────────────────────

  getMenuItems(): WaiterMenuItem[] {
    return this.inventorySvc.getAllItems()
      .filter(item => item.enabled && item.id !== null)
      .map(item => ({
        id: item.id as number,
        name: item.name,
        category: Array.isArray(item.category) ? item.category[0] ?? 'Other' : item.category,
        price: item.price,
        group: item.group,
        description: '',
        image: item.image,
        available: item.enabled,
      }));
  }

  getCategories(): string[] {
    const items = this.getMenuItems();
    return [...new Set(items.map(m => m.category))];
  }

  getTables(): Table[] {
    return this.tableSvc.getTables();
  }

  getOrderForTable(tableId: number): WaiterOrderItem[] {
    return this.ordersMap.get(tableId) ?? [];
  }

  // ── Per-table order state ───────────────────────────
  private ordersMap = new Map<number, WaiterOrderItem[]>();
  private ordersSubject = new BehaviorSubject<Map<number, WaiterOrderItem[]>>(this.ordersMap);
  orders$ = this.ordersSubject.asObservable();

  // ── Order mutations ─────────────────────────────────

  addItem(tableId: number, item: WaiterMenuItem): void {
    const order = this.ordersMap.get(tableId) ?? [];
    const existing = order.find(o => o.menuItemId === item.id);
    if (existing) {
      existing.qty++;
    } else {
      order.push({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        note: '',
        category: item.category,
        group: item.group,
      });
    }
    this.ordersMap.set(tableId, [...order]);
    this.emit();
  }

  removeItem(tableId: number, menuItemId: number): void {
    const order = this.ordersMap.get(tableId) ?? [];
    const existing = order.find(o => o.menuItemId === menuItemId);
    if (!existing) return;
    if (existing.qty > 1) {
      existing.qty--;
      this.ordersMap.set(tableId, [...order]);
    } else {
      this.ordersMap.set(tableId, order.filter(o => o.menuItemId !== menuItemId));
    }
    this.emit();
  }

  updateItemNote(tableId: number, menuItemId: number, note: string): void {
    const order = this.ordersMap.get(tableId) ?? [];
    const item = order.find(o => o.menuItemId === menuItemId);
    if (item) {
      item.note = note;
      this.ordersMap.set(tableId, [...order]);
      this.emit();
    }
  }

  clearOrder(tableId: number): void {
    this.ordersMap.set(tableId, []);
    this.emit();
  }

  getItemQty(tableId: number, menuItemId: number): number {
    return this.ordersMap.get(tableId)?.find(o => o.menuItemId === menuItemId)?.qty ?? 0;
  }

  getOrderTotal(tableId: number): number {
    return (this.ordersMap.get(tableId) ?? [])
      .reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  getOrderItemCount(tableId: number): number {
    return (this.ordersMap.get(tableId) ?? [])
      .reduce((sum, item) => sum + item.qty, 0);
  }

  private emit(): void {
    this.ordersSubject.next(new Map(this.ordersMap));
  }

  // ── Helpers ─────────────────────────────────────────

  getElapsedMinutes(table: Table): number {
    if (!table.timeOccupied) return 0;
    return Math.floor((Date.now() - new Date(table.timeOccupied).getTime()) / 60000);
  }

  formatElapsed(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
}
