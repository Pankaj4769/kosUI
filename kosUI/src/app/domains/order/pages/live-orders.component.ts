import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';

// ✅ CHANGE 1: Update service import
import { OrderManagementService } from '../services/order-management.service';
import { Order, OrderStatus, OrderPriority, OrderType } from '../models/order.model';

type FilterType = OrderStatus | 'ALL';

@Component({
  selector: 'app-live-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-orders.component.html',
  styleUrls: ['./live-orders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveOrdersComponent implements OnInit, OnDestroy {

  OrderStatus = OrderStatus;
  OrderPriority = OrderPriority;
  OrderType = OrderType;

  orders: Order[] = [];
  filteredOrders: Order[] = [];
  filter: FilterType = 'ALL';

  stats = {
    total: 0,
    pending: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    totalRevenue: 0,
    avgPrepTime: 0
  };

  private destroy$ = new Subject<void>();
  private statusCounts = new Map<OrderStatus, number>();

  // ✅ CHANGE 2: Update constructor to use OrderManagementService
  constructor(
    private orderManagementService: OrderManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ✅ CHANGE 3: Use activeOrders$ for live orders view
    this.orderManagementService.activeOrders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.orders = [...orders];
        this.updateDashboard();
        this.cdr.markForCheck();
      });

    // Auto-refresh every 5 seconds
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateDashboard(): void {
    this.applyFilter();
    this.calculateStats();
  }

  /* ================= FILTER ================= */

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

  /* ================= SORTING ================= */

  // ✅ CHANGE 4: Updated sortOrders to handle dynamic OrderPriority enum
  private sortOrders(orders: Order[]): Order[] {
    // Get all priority values dynamically
    const priorityValues = Object.values(OrderPriority) as OrderPriority[];
    
    // Create dynamic priority order map
    const priorityOrder = new Map<OrderPriority, number>();
    priorityValues.forEach((priority, index) => {
      priorityOrder.set(priority, index + 1);
    });

    return orders.sort((a, b) => {
      // Priority: First value in enum = highest priority
      const aPriority = priorityOrder.get(a.priority) || 999;
      const bPriority = priorityOrder.get(b.priority) || 999;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Secondary: oldest first
      return a.orderTime.getTime() - b.orderTime.getTime();
    });
  }

  /* ================= STATS ================= */

  private calculateStats(): void {
    this.statusCounts.clear();

    this.orders.forEach(o => {
      const count = (this.statusCounts.get(o.status) || 0) + 1;
      this.statusCounts.set(o.status, count);
    });

    const pending = this.statusCounts.get(OrderStatus.PENDING) || 0;
    const preparing = this.statusCounts.get(OrderStatus.PREPARING) || 0;
    const ready = this.statusCounts.get(OrderStatus.READY) || 0;
    const served = this.statusCounts.get(OrderStatus.SERVED) || 0;

    const totalRevenue = this.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    const prepTimes = this.orders.filter(o => o.prepTime).map(o => o.prepTime!);
    const avgPrepTime = prepTimes.length > 0
      ? Math.round(prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length)
      : 0;

    this.stats = {
      total: this.orders.length,
      pending,
      preparing,
      ready,
      served,
      totalRevenue,
      avgPrepTime
    };
  }

  /* ================= ACTIONS ================= */

  // ✅ CHANGE 5: Update status method to use OrderManagementService
  updateStatus(order: Order, status: OrderStatus): void {
    this.orderManagementService.updateOrderStatus(order.id, status);
    // Note: When status is SERVED or CANCELLED, order automatically moves to history
  }

  markAsPreparing(order: Order): void {
    this.updateStatus(order, OrderStatus.PREPARING);
  }

  markAsReady(order: Order): void {
    this.updateStatus(order, OrderStatus.READY);
  }

  markAsServed(order: Order): void {
    this.updateStatus(order, OrderStatus.SERVED);
    // ✅ Order will automatically move to history after this update
  }

  // ✅ CHANGE 6: Update cancelOrder to use OrderManagementService
  cancelOrder(order: Order): void {
    if (confirm(`Cancel order ${order.orderNumber}?`)) {
      // Option 1: Delete order completely
      // this.orderManagementService.deleteOrder(order.id);
      
      // Option 2: Mark as cancelled (better for history tracking)
      this.orderManagementService.updateOrderStatus(order.id, OrderStatus.CANCELLED);
      // ✅ Order will automatically move to history
    }
  }

  getElapsedTime(order: Order): string {
    const elapsed = Math.floor((Date.now() - order.orderTime.getTime()) / 60000);
    return `${elapsed} min`;
  }

  getTimeClass(order: Order): string {
    const elapsed = Math.floor((Date.now() - order.orderTime.getTime()) / 60000);
    if (elapsed > 30) return 'time-critical';
    if (elapsed > 20) return 'time-warning';
    return 'time-normal';
  }

  trackById(index: number, order: Order): number {
    return order.id;
  }

  // ✅ OPTIONAL ADDITION: Update order priority
  updatePriority(order: Order, priority: OrderPriority): void {
    this.orderManagementService.updateOrderPriority(order.id, priority);
  }

  // ✅ OPTIONAL ADDITION: Refresh orders manually
  refreshOrders(): void {
    this.orderManagementService.refreshAllOrders();
  }

  // ✅ OPTIONAL ADDITION: Get priority badge class for styling
  getPriorityClass(priority: OrderPriority): string {
    const priorityValues = Object.values(OrderPriority) as OrderPriority[];
    const index = priorityValues.indexOf(priority);
    
    // Assuming first value is highest priority
    if (index === 0) return 'priority-urgent';
    if (index === 1) return 'priority-high';
    if (index === 2) return 'priority-medium';
    return 'priority-low';
  }

  // ✅ OPTIONAL ADDITION: Get priority label
  getPriorityLabel(priority: OrderPriority): string {
    return String(priority).toLowerCase();
  }
}
