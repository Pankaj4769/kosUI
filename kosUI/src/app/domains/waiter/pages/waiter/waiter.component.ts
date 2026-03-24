import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { Table } from '../../../pos/models/table.model';
import { Order, OrderStatus, OrderPriority, OrderType, OrderItem } from '../../../order/models/order.model';
import { OrderManagementService } from '../../../order/services/order-management.service';
import {
  WaiterOrderService,
  WaiterMenuItem,
  WaiterOrderItem
} from '../../services/waiter-order.service';

type WaiterView = 'tables' | 'ordering';
type MobileTab  = 'menu' | 'order';
type TableFilter = 'all' | 'available' | 'occupied' | 'reserved';

@Component({
  selector: 'app-waiter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatTooltipModule],
  templateUrl: './waiter.component.html',
  styleUrls: ['./waiter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaiterComponent implements OnInit, OnDestroy {

  /* ── View state ───────────────────────────────────── */
  view: WaiterView    = 'tables';
  mobileTab: MobileTab = 'menu';

  /* ── Tables view ──────────────────────────────────── */
  tables: Table[]            = [];
  filteredTables: Table[]    = [];
  tableFilter: TableFilter   = 'all';
  tableSearch                = '';
  selectedTable: Table | null = null;

  /* ── Menu ─────────────────────────────────────────── */
  menuItems: WaiterMenuItem[]    = [];
  filteredMenu: WaiterMenuItem[] = [];
  categories: string[]           = [];
  activeCategory                 = 'All';
  menuSearch                     = '';
  vegOnly                        = false;

  /* ── Current order ────────────────────────────────── */
  orderItems: WaiterOrderItem[] = [];
  orderNote                     = '';
  kotSent                       = false;
  expandedNoteItemId: number | null = null;

  /* ── Time ─────────────────────────────────────────── */
  currentTime = '';
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  /* ── Toast ────────────────────────────────────────── */
  toast: { msg: string; type: 'success' | 'error' | 'info' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private sub = new Subscription();

  constructor(
    private svc: WaiterOrderService,
    private orderMgmt: OrderManagementService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateTime();
    this.timeInterval = setInterval(() => { this.updateTime(); this.cdr.markForCheck(); }, 1000);

    this.tables    = this.svc.getTables();
    this.menuItems = this.svc.getMenuItems();
    this.categories = ['All', ...this.svc.getCategories()];
    this.applyTableFilter();
    this.applyMenuFilter();

    this.sub.add(
      this.svc.orders$.subscribe(() => {
        if (this.selectedTable) {
          this.orderItems = this.svc.getOrderForTable(this.selectedTable.id);
        }
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  /* ── Table helpers ────────────────────────────────── */

  get tableStats() {
    return {
      total:     this.tables.length,
      available: this.tables.filter(t => t.status === 'available').length,
      occupied:  this.tables.filter(t => t.status === 'occupied').length,
      reserved:  this.tables.filter(t => t.status === 'reserved').length,
    };
  }

  setTableFilter(f: TableFilter): void {
    this.tableFilter = f;
    this.applyTableFilter();
  }

  applyTableFilter(): void {
    let list = [...this.tables];
    if (this.tableFilter !== 'all') {
      list = list.filter(t => t.status === this.tableFilter);
    }
    if (this.tableSearch.trim()) {
      const q = this.tableSearch.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.section?.toLowerCase().includes(q)
      );
    }
    this.filteredTables = list;
  }

  selectTable(table: Table): void {
    this.selectedTable = table;
    this.orderItems    = this.svc.getOrderForTable(table.id);
    this.kotSent       = false;
    this.orderNote     = '';
    this.mobileTab     = 'menu';
    this.view          = 'ordering';
    this.applyMenuFilter();
  }

  backToTables(): void {
    this.view          = 'tables';
    this.selectedTable = null;
  }

  getElapsed(table: Table): string {
    const mins = this.svc.getElapsedMinutes(table);
    return mins ? this.svc.formatElapsed(mins) : '';
  }

  isUrgent(table: Table): boolean {
    return this.svc.getElapsedMinutes(table) > 60;
  }

  /* ── Menu helpers ─────────────────────────────────── */

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.applyMenuFilter();
  }

  applyMenuFilter(): void {
    let list = [...this.menuItems];
    if (this.activeCategory !== 'All') {
      list = list.filter(m => m.category === this.activeCategory);
    }
    if (this.vegOnly) {
      list = list.filter(m => m.group === 'Veg');
    }
    if (this.menuSearch.trim()) {
      const q = this.menuSearch.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    this.filteredMenu = list;
  }

  /* ── Order mutations ──────────────────────────────── */

  addItem(item: WaiterMenuItem): void {
    if (!this.selectedTable) return;
    this.svc.addItem(this.selectedTable.id, item);
    this.kotSent = false;
  }

  removeItem(menuItemId: number): void {
    if (!this.selectedTable) return;
    this.svc.removeItem(this.selectedTable.id, menuItemId);
    this.kotSent = false;
  }

  getItemQty(menuItemId: number): number {
    if (!this.selectedTable) return 0;
    return this.svc.getItemQty(this.selectedTable.id, menuItemId);
  }

  get orderTotal(): number {
    return this.selectedTable ? this.svc.getOrderTotal(this.selectedTable.id) : 0;
  }

  get orderItemCount(): number {
    return this.selectedTable ? this.svc.getOrderItemCount(this.selectedTable.id) : 0;
  }

  get hasItems(): boolean {
    return this.orderItemCount > 0;
  }

  toggleItemNote(id: number): void {
    this.expandedNoteItemId = this.expandedNoteItemId === id ? null : id;
  }

  saveItemNote(tableId: number, menuItemId: number, note: string): void {
    this.svc.updateItemNote(tableId, menuItemId, note);
  }

  sendKOT(): void {
    if (!this.hasItems || !this.selectedTable) return;

    const table = this.selectedTable;
    const items = this.svc.getOrderForTable(table.id);

    const orderItems: OrderItem[] = items.map(i => ({
      id: i.menuItemId,
      name: i.name,
      quantity: i.qty,
      price: i.price,
      notes: i.note || undefined,
      category: i.category,
    }));

    const existingOrders = this.orderMgmt.getAllOrders();
    const nextId = existingOrders.length > 0
      ? Math.max(...existingOrders.map(o => o.id)) + 1
      : 1;

    const order: Order = {
      id: nextId,
      orderNumber: `KOT-${Date.now()}`,
      tableId: table.id,
      tableName: table.name,
      status: OrderStatus.PENDING,
      priority: OrderPriority.MEDIUM,
      type: OrderType.DINE_IN,
      items: orderItems,
      totalAmount: this.orderTotal,
      waiterName: table.waiter ?? undefined,
      orderTime: new Date(),
      notes: this.orderNote || undefined,
    };

    this.orderMgmt.addOrder(order);
    this.svc.clearOrder(table.id);
    this.orderNote = '';
    this.kotSent = true;

    this.router.navigate(['/orders/live']);
  }

  holdOrder(): void {
    if (!this.hasItems) return;
    this.showToast('Order held successfully', 'info');
  }

  clearOrder(): void {
    if (!this.selectedTable || !this.hasItems) return;
    this.svc.clearOrder(this.selectedTable.id);
    this.kotSent = false;
    this.orderNote = '';
    this.showToast('Order cleared', 'info');
  }

  /* ── Toast ────────────────────────────────────────── */

  private showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.markForCheck();
    }, 2800);
  }

  /* ── TrackBy ──────────────────────────────────────── */
  trackTable(_: number, t: Table): number          { return t.id; }
  trackMenu(_: number, m: WaiterMenuItem): number  { return m.id; }
  trackOrder(_: number, o: WaiterOrderItem): number { return o.menuItemId; }
}
