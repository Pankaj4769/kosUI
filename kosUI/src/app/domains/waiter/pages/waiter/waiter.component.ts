import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';

import { Table } from '../../../pos/models/table.model';
import { Order, OrderStatus, OrderPriority, OrderType, OrderItem } from '../../../order/models/order.model';
import { OrderManagementService } from '../../../order/services/order-management.service';
import { TableService } from '../../../pos/services/table.service';
import {
  WaiterOrderService,
  WaiterMenuItem,
  WaiterOrderItem
} from '../../services/waiter-order.service';
import { TableSessionService } from '../../../pos/../../core/services/table-session.service';

type WaiterView   = 'tables' | 'ordering';
type MobileTab    = 'menu' | 'order';
type TableFilter  = 'all' | 'available' | 'occupied' | 'reserved';

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
  view: WaiterView     = 'tables';
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
  kotCount                      = 0;  // how many KOTs sent for this table session
  expandedNoteItemId: number | null = null;

  /* ── Notifications (order ready) ──────────────────── */
  readyOrders: Order[]         = [];
  showReadyPanel               = false;
  private dismissedReadyIds    = new Set<number>();

  /* ── Session orders (sent KOT rounds) ────────────── */
  sessionOrders: Order[] = [];

  /* ── Bill request ─────────────────────────────────── */
  billRequested = false;

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
    private tableSvc: TableService,
    private sessionSvc: TableSessionService,
    private authSvc: AuthService,
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

    // Sync live table list from TableService
    this.sub.add(
      this.tableSvc.tables$.subscribe(tables => {
        this.tables = tables;
        this.applyTableFilter();
        // Keep selectedTable in sync
        if (this.selectedTable) {
          const updated = tables.find(t => t.id === this.selectedTable!.id);
          if (updated) {
            this.selectedTable = updated;
            this.billRequested = !!updated.billRequested;
          }
        }
        this.cdr.markForCheck();
      })
    );

    // Sync order items
    this.sub.add(
      this.svc.orders$.subscribe(() => {
        if (this.selectedTable) {
          this.orderItems = this.svc.getOrderForTable(this.selectedTable.id);
        }
        this.cdr.markForCheck();
      })
    );

    // Subscribe to active orders to show "In Kitchen" for current session
    this.sub.add(
      this.orderMgmt.activeOrders$.subscribe(orders => {
        const session = this.selectedTable
          ? this.sessionSvc.getCached(this.selectedTable.id)
          : null;
        this.sessionOrders = session
          ? orders.filter(o => o.sessionId === session.sessionId)
          : [];
        this.cdr.markForCheck();
      })
    );

    // Keep readyOrders in sync with live order state (survives navigation)
    this.sub.add(
      this.orderMgmt.readyOrders$.subscribe(orders => {
        this.readyOrders = orders;
        this.cdr.markForCheck();
      })
    );

    // Auto-open panel + toast when a NEW order transitions to READY
    this.sub.add(
      this.orderMgmt.orderReady$.subscribe(order => {
        this.dismissedReadyIds.delete(order.id); // re-surface if previously dismissed
        this.showReadyPanel = true;
        this.showToast(`Order ready: ${order.tableName ?? order.orderNumber}`, 'success');
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

  /* ── Notification helpers ─────────────────────────── */

  get visibleReadyOrders(): Order[] {
    return this.readyOrders.filter(o => !this.dismissedReadyIds.has(o.id));
  }

  get unreadCount(): number { return this.visibleReadyOrders.length; }

  toggleReadyPanel(): void {
    this.showReadyPanel = !this.showReadyPanel;
    this.cdr.markForCheck();
  }

  dismissReady(orderId: number): void {
    this.dismissedReadyIds.add(orderId);
    if (this.visibleReadyOrders.length === 0) this.showReadyPanel = false;
    this.cdr.markForCheck();
  }

  markServed(order: Order): void {
    this.orderMgmt.updateOrderStatus(order.id, OrderStatus.SERVED);
    this.dismissedReadyIds.add(order.id);
    if (this.visibleReadyOrders.length === 0) this.showReadyPanel = false;
    this.showToast(`Served: ${order.tableName ?? order.orderNumber}`, 'success');
    this.cdr.markForCheck();
  }

  dismissAllReady(): void {
    this.readyOrders.forEach(o => this.dismissedReadyIds.add(o.id));
    this.showReadyPanel = false;
    this.cdr.markForCheck();
  }

  getReadyMinutes(order: Order): number {
    if (!order.readyAt) return 0;
    return Math.floor((Date.now() - order.readyAt.getTime()) / 60000);
  }

  getItemsSummary(order: Order): string {
    const names = order.items.slice(0, 3).map(i => i.name);
    const extra = order.items.length > 3 ? ` +${order.items.length - 3} more` : '';
    return names.join(', ') + extra;
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
    this.orderNote     = '';
    this.billRequested = !!table.billRequested;
    this.mobileTab     = 'menu';
    this.view          = 'ordering';

    const restaurantId = this.authSvc.currentUser?.restaurantId ?? '';
    // Cache hit → fires synchronously (of()); cache miss → one DB call
    this.sessionSvc.getOrCreate(table.id, table.name, restaurantId, table.waiter ?? undefined)
      .subscribe(session => {
        this.kotCount      = session.kotRound - 1;
        this.sessionOrders = this.orderMgmt.getOrdersBySession(session.sessionId)
          .filter(o => o.status !== 'SERVED' && o.status !== 'CANCELLED');
        this.applyMenuFilter();
        this.cdr.markForCheck();
      });
  }

  backToTables(): void {
    this.view          = 'tables';
    this.selectedTable = null;
    this.sessionOrders = [];
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
  }

  removeItem(menuItemId: number): void {
    if (!this.selectedTable) return;
    this.svc.removeItem(this.selectedTable.id, menuItemId);
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

  /* ── KOT ──────────────────────────────────────────── */

  // Gap 5: Don't navigate away — stay on ordering view so waiter can add more items
  sendKOT(): void {
    if (!this.hasItems || !this.selectedTable) return;

    const table    = this.selectedTable;
    const items    = this.svc.getOrderForTable(table.id);
    const session  = this.sessionSvc.getCached(table.id);
    if (!session) return;
    const kotRound = this.sessionSvc.nextKot(table.id);

    const orderItems: OrderItem[] = items.map(i => ({
      id: i.menuItemId, name: i.name, quantity: i.qty,
      price: i.price, notes: i.note || undefined, category: i.category,
    }));

    const order: Order = {
      id:          Date.now(),
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      tableId:     table.id,
      tableName:   table.name,
      status:      OrderStatus.PENDING,
      priority:    OrderPriority.MEDIUM,
      type:        OrderType.DINE_IN,
      items:       orderItems,
      totalAmount: this.orderTotal,
      waiterName:  table.waiter ?? session.waiterName ?? undefined,
      orderTime:   new Date(),
      notes:       this.orderNote || undefined,
      sessionId:   session.sessionId,
      kotRound,
    };

    // Snapshot BEFORE sendKotOrder fires activeOrders$ (which updates sessionOrders sync)
    const prevItems  = this.sessionOrders.reduce((s, o) => s + o.items.length, 0);
    const prevAmount = this.sessionOrders.reduce((s, o) => s + o.totalAmount, 0);

    // Optimistic local add + POST to backend (SSE broadcasts to cashier)
    this.orderMgmt.sendKotOrder(order);
    this.tableSvc.updateTableStatus(table.id, 'occupied');
    this.tableSvc.updateTableOrderInfo(table.id, prevItems + orderItems.length, prevAmount + this.orderTotal);
    const waiterName = session.waiterName ?? table.waiter;
    if (waiterName) this.tableSvc.assignWaiter(table.id, waiterName);
    this.svc.clearOrder(table.id);
    this.orderNote  = '';
    this.kotCount   = kotRound;

    this.showToast(`KOT Round ${kotRound} sent — ${order.orderNumber}`, 'success');
    this.cdr.markForCheck();
  }

  /* ── Gap 6: Request Bill ──────────────────────────── */

  requestBill(): void {
    if (!this.selectedTable) return;
    this.tableSvc.requestBill(this.selectedTable.id);
    this.sessionSvc.setBilling(this.selectedTable.id);
    this.billRequested = true;
    this.showToast(`Bill requested for ${this.selectedTable.name}`, 'success');
    this.cdr.markForCheck();
  }

  /* ── Hold / Clear ─────────────────────────────────── */

  holdOrder(): void {
    if (!this.hasItems) return;
    this.showToast('Order held successfully', 'info');
  }

  clearOrder(): void {
    if (!this.selectedTable || !this.hasItems) return;
    this.svc.clearOrder(this.selectedTable.id);
    this.kotCount = 0;
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
    }, 3500);
  }

  /* ── TrackBy ──────────────────────────────────────── */
  trackTable(_: number, t: Table): number           { return t.id; }
  trackMenu(_: number, m: WaiterMenuItem): number   { return m.id; }
  trackOrder(_: number, o: WaiterOrderItem): number { return o.menuItemId; }
  trackReady(_: number, o: Order): number           { return o.id; }
}
