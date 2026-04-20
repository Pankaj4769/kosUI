import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';

import { OrderManagementService } from '../services/order-management.service';
import { Order, OrderStatus, OrderPriority, OrderType } from '../models/order.model';

type FilterType = OrderStatus | 'ALL';

interface ReadyNotification {
  id: number;
  order: Order;
  timestamp: Date;
}

@Component({
  selector: 'app-live-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-orders.component.html',
  styleUrls: ['./live-orders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveOrdersComponent implements OnInit, OnDestroy {

  OrderStatus   = OrderStatus;
  OrderPriority = OrderPriority;
  OrderType     = OrderType;

  orders:         Order[] = [];
  filteredOrders: Order[] = [];
  filter: FilterType = 'ALL';

  /* ── Notification queue ── */
  notifications: ReadyNotification[] = [];
  private notificationIdCounter = 0;
  private notificationAudio: HTMLAudioElement | null = null;

  /* ── Stats object ── */
  stats = {
    total:        0,
    pending:      0,
    preparing:    0,
    ready:        0,
    served:       0,
    totalRevenue: 0,
    avgPrepTime:  0,
    dineIn:    0,
    takeaway:  0,
    delivery:  0
  };

  private destroy$      = new Subject<void>();
  private statusCounts  = new Map<OrderStatus, number>();

  constructor(
    private orderManagementService: OrderManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  /* ═══════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════ */
  ngOnInit(): void {
    this.orderManagementService.activeOrders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.orders = [...orders];
        this.updateDashboard();
        this.cdr.markForCheck();
      });

    // Listen for "Order Ready" events from SSE
    this.orderManagementService.orderReady$
      .pipe(takeUntil(this.destroy$))
      .subscribe(order => {
        this.showReadyNotification(order);
        this.cdr.markForCheck();
      });

    // Auto-refresh every 5 s (elapsed-time display)
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ═══════════════════════════════════════════
     ORDER READY NOTIFICATIONS
  ═══════════════════════════════════════════ */
  private showReadyNotification(order: Order): void {
    const notification: ReadyNotification = {
      id: ++this.notificationIdCounter,
      order,
      timestamp: new Date()
    };
    this.notifications = [notification, ...this.notifications];

    // Play alert sound
    this.playNotificationSound();

    // Auto-dismiss after 15 seconds
    const nId = notification.id;
    setTimeout(() => this.dismissNotification(nId), 15000);
  }

  dismissNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.cdr.markForCheck();
  }

  private playNotificationSound(): void {
    try {
      // Use Web Audio API to generate a pleasant chime (no external file needed)
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 chord

      frequencies.forEach((freq, i) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);

        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.8);

        oscillator.start(audioCtx.currentTime + i * 0.15);
        oscillator.stop(audioCtx.currentTime + i * 0.15 + 0.8);
      });
    } catch (e) {
      // Audio not available — fail silently
    }
  }

  /* ═══════════════════════════════════════════
     DASHBOARD
  ═══════════════════════════════════════════ */
  private updateDashboard(): void {
    this.applyFilter();
    this.calculateStats();
  }

  /* ═══════════════════════════════════════════
     FILTER
  ═══════════════════════════════════════════ */
  setFilter(filter: FilterType): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private applyFilter(): void {
    const filtered =
      this.filter === 'ALL'
        ? [...this.orders]
        : this.orders.filter(o => o.status === this.filter);

    this.filteredOrders = this.sortOrders(filtered);
  }

  /* ═══════════════════════════════════════════
     SORTING
  ═══════════════════════════════════════════ */
  private sortOrders(orders: Order[]): Order[] {
    const priorityValues = Object.values(OrderPriority) as OrderPriority[];
    const priorityOrder  = new Map<OrderPriority, number>();
    priorityValues.forEach((p, i) => priorityOrder.set(p, i + 1));

    return [...orders].sort((a, b) => {
      const ap = priorityOrder.get(a.priority) ?? 999;
      const bp = priorityOrder.get(b.priority) ?? 999;
      if (ap !== bp) return ap - bp;
      return a.orderTime.getTime() - b.orderTime.getTime();
    });
  }

  /* ═══════════════════════════════════════════
     STATS  ← includes order-type counts
  ═══════════════════════════════════════════ */
  private calculateStats(): void {
    this.statusCounts.clear();

    // Status counts
    this.orders.forEach(o => {
      this.statusCounts.set(o.status, (this.statusCounts.get(o.status) ?? 0) + 1);
    });

    // ✅ Order-type counts
    const dineIn   = this.orders.filter(o => o.type === OrderType.DINE_IN).length;
    const takeaway = this.orders.filter(o => o.type === OrderType.TAKEAWAY).length;
    const delivery = this.orders.filter(o => o.type === OrderType.DELIVERY).length;

    // Revenue
    const totalRevenue = this.orders.reduce((s, o) => s + o.totalAmount, 0);

    // Avg prep time
    const prepTimes  = this.orders.filter(o => o.prepTime).map(o => o.prepTime!);
    const avgPrepTime = prepTimes.length
      ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
      : 0;

    this.stats = {
      total:       this.orders.length,
      pending:     this.statusCounts.get(OrderStatus.PENDING)   ?? 0,
      preparing:   this.statusCounts.get(OrderStatus.PREPARING) ?? 0,
      ready:       this.statusCounts.get(OrderStatus.READY)     ?? 0,
      served:      this.statusCounts.get(OrderStatus.SERVED)    ?? 0,
      totalRevenue,
      avgPrepTime,
      // ✅ NEW
      dineIn,
      takeaway,
      delivery
    };
  }

  /* ═══════════════════════════════════════════
     ACTIONS
  ═══════════════════════════════════════════ */
  updateStatus(order: Order, status: OrderStatus): void {
    this.orderManagementService.updateOrderStatus(order.id, status);
  }

  markAsPreparing(order: Order): void { this.updateStatus(order, OrderStatus.PREPARING); }
  markAsReady(order: Order):     void { this.updateStatus(order, OrderStatus.READY);     }
  markAsServed(order: Order):    void { this.updateStatus(order, OrderStatus.SERVED);    }

  cancelOrder(order: Order): void {
    if (confirm(`Cancel order ${order.orderNumber}?`)) {
      this.orderManagementService.updateOrderStatus(order.id, OrderStatus.CANCELLED);
    }
  }

  updatePriority(order: Order, priority: OrderPriority): void {
    this.orderManagementService.updateOrderPriority(order.id, priority);
  }

  refreshOrders(): void {
    this.orderManagementService.refreshAllOrders();
  }

  /* ═══════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════ */
  getElapsedTime(order: Order): string {
    const mins = Math.floor((Date.now() - order.orderTime.getTime()) / 60000);
    return `${mins} min`;
  }

  getTimeClass(order: Order): string {
    const mins = Math.floor((Date.now() - order.orderTime.getTime()) / 60000);
    if (mins > 30) return 'time-critical';
    if (mins > 20) return 'time-warning';
    return 'time-normal';
  }

  getPriorityClass(priority: OrderPriority): string {
    const vals  = Object.values(OrderPriority) as OrderPriority[];
    const index = vals.indexOf(priority);
    if (index === 0) return 'priority-urgent';
    if (index === 1) return 'priority-high';
    if (index === 2) return 'priority-medium';
    return 'priority-low';
  }

  getPriorityLabel(priority: OrderPriority): string {
    return String(priority).toLowerCase();
  }

  // ✅ NEW — order-type display helpers
  getOrderTypeIcon(type: OrderType): string {
    switch (type) {
      case OrderType.DINE_IN:   return '🍽️';
      case OrderType.TAKEAWAY:  return '🥡';
      case OrderType.DELIVERY:  return '🛵';
      default: return '📦';
    }
  }

  getOrderTypeLabel(type: OrderType): string {
    return type.toString().replace('_', ' ');
  }

  trackById(_: number, order: Order): number {
    return order.id;
  }
}
