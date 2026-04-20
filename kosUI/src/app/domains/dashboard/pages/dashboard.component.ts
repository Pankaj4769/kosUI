import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, combineLatest, interval } from 'rxjs';

// Material Modules
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

// Forms
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

// Services
import { InventoryService } from '../services/inventory.service';
import { OrderManagementService } from '../../order/services/order-management.service';
import { TableService } from '../../pos/services/table.service';

// Models
import { Order, OrderStatus, OrderType } from '../../order/models/order.model';
import { Item } from '../models/item.model';

// Interfaces
interface DashboardMetric {
  label: string;
  value: number;
  displayValue: string;
  icon: string;
  color: string;
  bgColor: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
}

interface CategoryStats {
  name: string;
  count: number;
  percentage: number;
  color: string;
  value: number;
}

interface TopSellingItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  image?: string;
  trend: 'up' | 'down' | 'stable';
}

interface RecentOrderDisplay {
  id: number;
  orderNumber: string;
  time: string;
  customerName: string;
  items: number;
  total: number;
  status: OrderStatus;
  statusLabel: string;
  statusColor: string;
}

interface Alert {
  id: number;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  icon: string;
  timestamp: Date;
}

interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
  type: 'order' | 'inventory' | 'system';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // State
  loading = false;
  lastUpdated = new Date();
  currentTime = new Date();

  // Data
  inventoryItems: Item[] = [];
  liveOrders: Order[] = [];
  completedOrders: Order[] = [];
  allOrders: Order[] = [];

  // Display Data
  metrics: DashboardMetric[] = [];
  categoryStats: CategoryStats[] = [];
  topSellingItems: TopSellingItem[] = [];
  recentOrders: RecentOrderDisplay[] = [];
  alerts: Alert[] = [];
  notifications: Notification[] = [];

  // Filters
  selectedDateRange: 'today' | 'week' | 'month' = 'today';
  selectedCategory = 'all';

  dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  categoryOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'All Categories' }
  ];

  ordersByStatus = { pending: 0, preparing: 0, ready: 0 };

  revenueByHour: { hour: string; amount: number }[] = [];

  peakHours = {
    busiest: '',
    quietest: '',
    currentStatus: 'normal' as 'quiet' | 'normal' | 'busy' | 'peak'
  };

  tableStatus = { occupied: 0, reserved: 0, available: 0, total: 0 };

  waiterStats: { name: string; orders: number; revenue: number }[] = [];

  orderTypeStats = {
    dineIn:    { count: 0, percent: 0 },
    takeaway:  { count: 0, percent: 0 },
    delivery:  { count: 0, percent: 0 }
  };

  avgWaitTime = { minutes: 0, status: 'good' as 'good' | 'warning' | 'critical' };

  dailyGoal = { target: 50000, current: 0, percent: 0, remaining: 0 };

  unreadNotifications = 0;

  /** READY orders waiting to be served — owner oversight panel */
  pendingDeliveries: Order[] = [];

  constructor(
    private inventoryService: InventoryService,
    private orderManagementService: OrderManagementService,
    private tableService: TableService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeDashboard();
    this.subscribeToData();
    this.startClock();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  private initializeDashboard(): void {
    this.loading = true;
    this.loadInventoryData();
    this.loading = false;
    this.cdr.markForCheck();
  }

  private subscribeToData(): void {
    combineLatest([
      this.orderManagementService.activeOrders$,
      this.orderManagementService.completedOrders$,
      this.orderManagementService.allOrders$,
      this.tableService.tables$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([active, completed, all]) => {
          this.liveOrders = active;
          this.completedOrders = completed;
          this.allOrders = all;

          this.calculateAllMetrics();
          this.generateNotifications();
          this.lastUpdated = new Date();

          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading orders:', err);
          this.addAlert('error', 'Data Error', 'Failed to load order data');
        }
      });

    // Track READY orders for owner oversight panel
    this.orderManagementService.readyOrders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.pendingDeliveries = orders.sort((a, b) =>
          (a.readyAt?.getTime() ?? 0) - (b.readyAt?.getTime() ?? 0)
        );
        this.cdr.markForCheck();
      });
  }

  private startClock(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
        this.cdr.markForCheck();
      });
  }

  private calculateAllMetrics(): void {
    this.calculateMetrics();
    this.calculateTopSelling();
    this.buildRecentOrders();
    this.calculateOrdersByStatus();
    this.calculateRevenueByHour();
    this.calculatePeakHours();
    this.calculateTableStatus();
    this.calculateWaiterStats();
    this.calculateOrderTypeStats();
    this.calculateAvgWaitTime();
    this.calculateDailyGoal();
    this.generateAlerts();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  private loadInventoryData(): void {
    if (this.inventoryService.getLoadedCategories().length === 0) {
      this.inventoryService.getMenuCategoryList()
        .pipe(takeUntil(this.destroy$))
        .subscribe(cats => {
          this.inventoryService.populateMenuCategories(cats);
          this.buildCategoryOptions();
          this.cdr.markForCheck();
        });
    }

    const cached = this.inventoryService.getAllItems();
    if (cached.length > 0) {
      this.inventoryItems = cached;
      this.calculateCategoryStats();
      this.buildCategoryOptions();
      this.calculateMetrics();
      this.cdr.markForCheck();
    } else {
      this.inventoryService.getItemlist()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (items) => {
            this.inventoryService.populateItems(items);
            this.inventoryItems = items;
            this.calculateCategoryStats();
            this.buildCategoryOptions();
            this.calculateMetrics();
            this.cdr.markForCheck();
          },
          error: (err) => {
            console.error('Error loading inventory:', err);
            this.addAlert('error', 'Inventory Error', 'Failed to load inventory data');
          }
        });
    }
  }

  private buildCategoryOptions(): void {
    const loaded = this.inventoryService.getLoadedCategories();
    const names: string[] = loaded.length > 0
      ? loaded.map(c => c.name)
      : [...new Set(this.inventoryItems.map(item => item.category[0]).filter(Boolean))];
    this.categoryOptions = [
      { value: 'all', label: 'All Categories' },
      ...names.map(cat => ({ value: cat, label: cat }))
    ];
  }

  // ============================================================
  // CORE METRICS CALCULATION
  // ============================================================

  private calculateTrendChange(current: number, previous: number): { change: number; trend: 'up' | 'down' | 'neutral' } {
    if (previous === 0) return { change: 0, trend: 'neutral' };
    const change = Math.round(((current - previous) / previous) * 100);
    return { change, trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' };
  }

  private calculateMetrics(): void {
    const filteredOrders = this.getFilteredOrders();
    const filteredCompleted = filteredOrders.filter(o => o.status === OrderStatus.SERVED);

    // Yesterday comparison for trend badges
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    const yesterdayOrders = this.allOrders.filter(o => {
      const t = new Date(o.orderTime).getTime();
      return t >= yesterday.getTime() && t <= yesterdayEnd.getTime();
    });
    const yesterdayCompleted = yesterdayOrders.filter(o => o.status === OrderStatus.SERVED);
    const yesterdayRevenue = yesterdayCompleted.reduce((sum, o) => sum + o.totalAmount, 0);

    const totalRevenue = filteredCompleted.reduce((sum, o) => sum + o.totalAmount, 0);
    const avgOrderValue = filteredCompleted.length > 0 ? totalRevenue / filteredCompleted.length : 0;

    const inventoryValue = this.inventoryService.getInventoryValue();
    const lowStockCount = this.inventoryService.getLowStockCount();
    const soldOutCount = this.inventoryService.getSoldOutCount();

    const ordersTrend   = this.calculateTrendChange(filteredOrders.length, yesterdayOrders.length);
    const completedTrend = this.calculateTrendChange(filteredCompleted.length, yesterdayCompleted.length);
    const revenueTrend  = this.calculateTrendChange(totalRevenue, yesterdayRevenue);

    this.metrics = [
      {
        label: 'Total Orders',
        value: filteredOrders.length,
        displayValue: filteredOrders.length.toString(),
        icon: 'shopping_cart',
        color: '#2563eb', bgColor: '#eff6ff',
        subtitle: `${this.liveOrders.length} active`,
        change: ordersTrend.change, trend: ordersTrend.trend
      },
      {
        label: 'Completed',
        value: filteredCompleted.length,
        displayValue: filteredCompleted.length.toString(),
        icon: 'check_circle',
        color: '#059669', bgColor: '#f0fdf4',
        subtitle: 'Orders served',
        change: completedTrend.change, trend: completedTrend.trend
      },
      {
        label: 'Pending',
        value: this.liveOrders.length,
        displayValue: this.liveOrders.length.toString(),
        icon: 'schedule',
        color: '#d97706', bgColor: '#fffbeb',
        subtitle: 'In kitchen'
      },
      {
        label: 'Revenue',
        value: totalRevenue,
        displayValue: this.formatCurrency(totalRevenue),
        icon: 'payments',
        color: '#7c3aed', bgColor: '#f5f3ff',
        subtitle: `Avg: ${this.formatCurrency(avgOrderValue)}`,
        change: revenueTrend.change, trend: revenueTrend.trend
      },
      {
        label: 'Inventory Value',
        value: inventoryValue,
        displayValue: this.formatCurrency(inventoryValue),
        icon: 'inventory',
        color: '#0284c7', bgColor: '#f0f9ff',
        subtitle: `${this.inventoryItems.length} items`
      },
      {
        label: 'Low Stock',
        value: lowStockCount,
        displayValue: lowStockCount.toString(),
        icon: 'warning',
        color: '#ea580c', bgColor: '#fff7ed',
        subtitle: 'Need restock'
      },
      {
        label: 'Sold Out',
        value: soldOutCount,
        displayValue: soldOutCount.toString(),
        icon: 'error',
        color: '#dc2626', bgColor: '#fff1f2',
        subtitle: 'Unavailable'
      },
      {
        label: 'Categories',
        value: this.categoryStats.length,
        displayValue: this.categoryStats.length.toString(),
        icon: 'category',
        color: '#9333ea', bgColor: '#faf5ff',
        subtitle: 'Active types'
      }
    ];
  }

  private calculateCategoryStats(): void {
    const categoryMap = new Map<string, { count: number; value: number }>();

    this.inventoryItems.forEach(item => {
      const key = item.category[0] || 'Other';
      const existing = categoryMap.get(key) || { count: 0, value: 0 };
      categoryMap.set(key, {
        count: existing.count + 1,
        value: existing.value + (item.qty * item.price)
      });
    });

    const total = this.inventoryItems.length || 1;
    const colors = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#9333ea', '#0284c7', '#ea580c'];

    this.categoryStats = Array.from(categoryMap.entries())
      .map(([name, data], index) => ({
        name,
        count: data.count,
        percentage: Math.round((data.count / total) * 100),
        color: colors[index % colors.length],
        value: data.value
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateTopSelling(): void {
    const filteredOrders = this.getFilteredOrders().filter(o => o.status === OrderStatus.SERVED);
    const itemSales = new Map<string, { quantity: number; revenue: number; category: string }>();

    filteredOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(orderItem => {
          const existing = itemSales.get(orderItem.name) || { quantity: 0, revenue: 0, category: '' };
          const inventoryItem = this.inventoryItems.find(i => i.name === orderItem.name);
          itemSales.set(orderItem.name, {
            quantity: existing.quantity + orderItem.quantity,
            revenue: existing.revenue + (orderItem.price * orderItem.quantity),
            category: inventoryItem?.category[0] || 'Other'
          });
        });
      }
    });

    this.topSellingItems = Array.from(itemSales.entries())
      .map(([name, data], index) => {
        const inventoryItem = this.inventoryItems.find(i => i.name === name);
        return {
          id: index + 1, name,
          category: data.category,
          quantity: data.quantity,
          revenue: data.revenue,
          image: inventoryItem?.image || 'assets/images/default-food.jpg',
          trend: 'stable' as 'up' | 'down' | 'stable'
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private buildRecentOrders(): void {
    const orders = [...this.completedOrders]
      .sort((a, b) => new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime())
      .slice(0, 10);

    this.recentOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber || `#${order.id}`,
      time: this.formatTime(order.orderTime),
      customerName: order.customerName || 'Guest',
      items: this.getOrderItemCount(order),
      total: order.totalAmount,
      status: order.status,
      statusLabel: this.getStatusLabel(order.status),
      statusColor: this.getStatusColor(order.status)
    }));
  }

  // ============================================================
  // CALCULATIONS
  // ============================================================

  private calculateOrdersByStatus(): void {
    this.ordersByStatus = {
      pending:  this.liveOrders.filter(o => o.status === OrderStatus.PENDING).length,
      preparing: this.liveOrders.filter(o => o.status === OrderStatus.PREPARING).length,
      ready:    this.liveOrders.filter(o => o.status === OrderStatus.READY).length
    };
  }

  private calculateRevenueByHour(): void {
    const hourMap = new Map<number, number>();
    this.getFilteredOrders()
      .filter(o => o.status === OrderStatus.SERVED)
      .forEach(order => {
        const hour = new Date(order.orderTime).getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + order.totalAmount);
      });

    this.revenueByHour = Array.from(hourMap.entries())
      .map(([hour, amount]) => ({ hour: `${hour}:00`, amount }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }

  private calculatePeakHours(): void {
    const hourCounts = new Map<number, number>();
    this.allOrders.forEach(order => {
      const hour = new Date(order.orderTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const sorted = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1]);
    this.peakHours.busiest  = sorted[0] ? `${sorted[0][0]}:00 - ${sorted[0][0] + 1}:00` : 'N/A';
    this.peakHours.quietest = sorted[sorted.length - 1]
      ? `${sorted[sorted.length - 1][0]}:00 - ${sorted[sorted.length - 1][0] + 1}:00`
      : 'N/A';

    const currentHour  = new Date().getHours();
    const currentCount = hourCounts.get(currentHour) || 0;
    const avg = Array.from(hourCounts.values()).reduce((a, b) => a + b, 0) / (hourCounts.size || 1);

    if (currentCount > avg * 1.5)      this.peakHours.currentStatus = 'peak';
    else if (currentCount > avg)       this.peakHours.currentStatus = 'busy';
    else if (currentCount < avg * 0.5) this.peakHours.currentStatus = 'quiet';
    else                               this.peakHours.currentStatus = 'normal';
  }

  private calculateTableStatus(): void {
    const stats = this.tableService.getTableStats();
    this.tableStatus.total     = stats.total;
    this.tableStatus.occupied  = stats.occupied;
    this.tableStatus.reserved  = stats.reserved;
    this.tableStatus.available = stats.available;
  }

  private calculateWaiterStats(): void {
    const waiterMap = new Map<string, { orders: number; revenue: number }>();
    this.getFilteredOrders()
      .filter(o => o.status === OrderStatus.SERVED)
      .forEach(order => {
        const waiter = order.waiterName || 'Unknown';
        const existing = waiterMap.get(waiter) || { orders: 0, revenue: 0 };
        waiterMap.set(waiter, { orders: existing.orders + 1, revenue: existing.revenue + order.totalAmount });
      });

    this.waiterStats = Array.from(waiterMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private calculateOrderTypeStats(): void {
    const filtered = this.getFilteredOrders();
    const total = filtered.length || 1;

    this.orderTypeStats = {
      dineIn:   { count: filtered.filter(o => o.type === OrderType.DINE_IN).length,   percent: 0 },
      takeaway: { count: filtered.filter(o => o.type === OrderType.TAKEAWAY).length,  percent: 0 },
      delivery: { count: filtered.filter(o => o.type === OrderType.DELIVERY).length,  percent: 0 }
    };
    this.orderTypeStats.dineIn.percent   = (this.orderTypeStats.dineIn.count / total) * 100;
    this.orderTypeStats.takeaway.percent = (this.orderTypeStats.takeaway.count / total) * 100;
    this.orderTypeStats.delivery.percent = (this.orderTypeStats.delivery.count / total) * 100;
  }

  private calculateAvgWaitTime(): void {
    const completedToday = this.getFilteredOrders().filter(o => o.status === OrderStatus.SERVED);
    if (completedToday.length === 0) {
      this.avgWaitTime.minutes = 0;
      this.avgWaitTime.status  = 'good';
      return;
    }

    const withPrepTime = completedToday.filter(o => o.prepTime && o.prepTime > 0);
    const avgMinutes = withPrepTime.length > 0
      ? Math.round(withPrepTime.reduce((sum, o) => sum + (o.prepTime || 0), 0) / withPrepTime.length)
      : Math.round(completedToday.reduce((sum, o) => {
          return sum + (Date.now() - new Date(o.orderTime).getTime()) / 60000;
        }, 0) / completedToday.length);

    this.avgWaitTime.minutes = Math.min(avgMinutes, 120);
    if (this.avgWaitTime.minutes < 20)      this.avgWaitTime.status = 'good';
    else if (this.avgWaitTime.minutes < 35) this.avgWaitTime.status = 'warning';
    else                                    this.avgWaitTime.status = 'critical';
  }

  private calculateDailyGoal(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = this.allOrders.filter(o => new Date(o.orderTime) >= today);
    this.dailyGoal.current   = todayOrders.filter(o => o.status === OrderStatus.SERVED).reduce((sum, o) => sum + o.totalAmount, 0);
    this.dailyGoal.percent   = (this.dailyGoal.current / this.dailyGoal.target) * 100;
    this.dailyGoal.remaining = Math.max(0, this.dailyGoal.target - this.dailyGoal.current);
  }

  // ============================================================
  // ALERTS & NOTIFICATIONS
  // ============================================================

  private generateAlerts(): void {
    this.alerts = [];
    let alertId = 1;

    this.inventoryItems.filter(item => item.qty === 0)
      .slice(0, 3)
      .forEach(item => {
        this.alerts.push({ id: alertId++, type: 'error', title: `${item.name} is Sold Out`, message: 'Item is unavailable. Restock immediately.', icon: 'error', timestamp: new Date() });
      });

    this.inventoryItems.filter(item => item.qty > 0 && item.qty <= 5)
      .slice(0, 3)
      .forEach(item => {
        this.alerts.push({ id: alertId++, type: 'warning', title: `${item.name} running low`, message: `Only ${item.qty} units remaining.`, icon: 'warning', timestamp: new Date() });
      });

    if (this.liveOrders.length > 10) {
      this.alerts.push({ id: alertId++, type: 'info', title: 'High Order Volume', message: `${this.liveOrders.length} orders in kitchen. Monitor wait times.`, icon: 'info', timestamp: new Date() });
    }

    if (this.avgWaitTime.status === 'critical') {
      this.alerts.push({ id: alertId++, type: 'warning', title: 'Long Wait Times', message: `Avg wait is ${this.avgWaitTime.minutes} min. Consider adding kitchen staff.`, icon: 'schedule', timestamp: new Date() });
    }
  }

  private generateNotifications(): void {
    const notifications: Notification[] = [];
    let id = 1;

    this.liveOrders.filter(o => o.status === OrderStatus.READY).slice(0, 3).forEach(order => {
      notifications.push({ id: id++, text: `Order ${order.orderNumber} is ready for pickup`, time: this.getRelativeTime(order.orderTime), read: false, type: 'order' });
    });

    this.inventoryItems.filter(item => item.qty > 0 && item.qty <= 5 && item.enabled).slice(0, 3).forEach(item => {
      notifications.push({ id: id++, text: `Low stock: ${item.name} (${item.qty} left)`, time: 'Now', read: false, type: 'inventory' });
    });

    this.inventoryItems.filter(item => item.qty === 0 && item.enabled).slice(0, 2).forEach(item => {
      notifications.push({ id: id++, text: `${item.name} is sold out`, time: 'Now', read: false, type: 'inventory' });
    });

    if (this.liveOrders.length > 10) {
      notifications.push({ id: id++, text: `High order volume: ${this.liveOrders.length} active orders`, time: 'Now', read: false, type: 'system' });
    }

    if (this.dailyGoal.percent >= 80 && this.dailyGoal.percent < 100) {
      notifications.push({ id: id++, text: `Daily goal ${this.dailyGoal.percent.toFixed(0)}% achieved`, time: 'Today', read: true, type: 'system' });
    } else if (this.dailyGoal.percent >= 100) {
      notifications.push({ id: id++, text: 'Daily revenue goal reached!', time: 'Today', read: true, type: 'system' });
    }

    this.notifications = notifications;
    this.unreadNotifications = notifications.filter(n => !n.read).length;
  }

  private getRelativeTime(date: Date): string {
    const diffMin = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (diffMin < 1)  return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    return `${Math.floor(diffMin / 60)} hr ago`;
  }

  // ============================================================
  // FILTERS
  // ============================================================

  private getFilteredOrders(): Order[] {
    let filtered = [...this.allOrders];
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (this.selectedDateRange) {
      case 'today':
        filtered = filtered.filter(o => new Date(o.orderTime) >= today);
        break;
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(o => new Date(o.orderTime) >= weekAgo);
        break;
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(o => new Date(o.orderTime) >= monthAgo);
        break;
      }
    }
    return filtered;
  }

  onDateRangeChange(): void { this.calculateAllMetrics(); this.cdr.markForCheck(); }
  onCategoryChange(): void  { this.cdr.markForCheck(); }

  get filteredCategoryStats(): CategoryStats[] {
    return this.selectedCategory === 'all'
      ? this.categoryStats
      : this.categoryStats.filter(c => c.name === this.selectedCategory);
  }

  get filteredTopSelling(): TopSellingItem[] {
    return this.selectedCategory === 'all'
      ? this.topSellingItems
      : this.topSellingItems.filter(i => i.category === this.selectedCategory);
  }

  // ============================================================
  // COMPUTED PROPERTIES
  // ============================================================

  get tableOccupancyPercent(): number {
    return this.tableStatus.total > 0 ? (this.tableStatus.occupied / this.tableStatus.total) * 100 : 0;
  }

  getRevenueBarHeight(amount: number): number {
    if (this.revenueByHour.length === 0) return 0;
    const max = Math.max(...this.revenueByHour.map(r => r.amount));
    return max > 0 ? (amount / max) * 100 : 0;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  getTotalQuantitySold(): number { return this.filteredTopSelling.reduce((sum, item) => sum + item.quantity, 0); }
  getTotalRevenueSold():  number { return this.filteredTopSelling.reduce((sum, item) => sum + item.revenue,  0); }

  private getOrderItemCount(order: Order): number {
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  private getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]:   'Pending',
      [OrderStatus.PREPARING]: 'Preparing',
      [OrderStatus.READY]:     'Ready',
      [OrderStatus.SERVED]:    'Completed',
      [OrderStatus.CANCELLED]: 'Cancelled'
    };
    return labels[status] || 'Unknown';
  }

  private getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]:   '#d97706',
      [OrderStatus.PREPARING]: '#2563eb',
      [OrderStatus.READY]:     '#059669',
      [OrderStatus.SERVED]:    '#16a34a',
      [OrderStatus.CANCELLED]: '#dc2626'
    };
    return colors[status] || '#64748b';
  }

  formatCurrency(amount: number): string {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }

  private formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private addAlert(type: 'error' | 'warning' | 'info', title: string, message: string): void {
    this.alerts.unshift({ id: Date.now(), type, title, message, icon: type, timestamp: new Date() });
    if (this.alerts.length > 20) this.alerts = this.alerts.slice(0, 20);
    this.cdr.markForCheck();
  }

  // ============================================================
  // USER ACTIONS
  // ============================================================

  dismissAlert(alertId: number): void { this.alerts = this.alerts.filter(a => a.id !== alertId); this.cdr.markForCheck(); }
  clearAllAlerts(): void               { this.alerts = []; this.cdr.markForCheck(); }

  markAsRead(id: number): void {
    const notif = this.notifications.find(n => n.id === id);
    if (notif && !notif.read) { notif.read = true; this.unreadNotifications--; this.cdr.markForCheck(); }
  }

  markAllAsRead(): void { this.notifications.forEach(n => n.read = true); this.unreadNotifications = 0; this.cdr.markForCheck(); }

  viewOrderDetails(order: RecentOrderDisplay): void { console.log('View order:', order); }

  refreshDashboard(): void {
    this.loading = true;
    this.loadInventoryData();
    this.orderManagementService.refreshAllOrders();
    this.lastUpdated = new Date();
    this.loading = false;
    this.cdr.markForCheck();
  }

  exportData(): void {
    const data = { metrics: this.metrics, topSelling: this.topSellingItems, recentOrders: this.recentOrders, revenueByHour: this.revenueByHour, waiterStats: this.waiterStats, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `dashboard-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  trackById(index: number, item: any): any { return item.id || index; }

  getPendingMinutes(order: Order): number {
    if (!order.readyAt) return 0;
    return Math.floor((this.currentTime.getTime() - order.readyAt.getTime()) / 60000);
  }

  getPendingUrgency(order: Order): 'ok' | 'warn' | 'critical' {
    const mins = this.getPendingMinutes(order);
    if (mins >= 10) return 'critical';
    if (mins >= 5)  return 'warn';
    return 'ok';
  }

  getDeliveryItemsSummary(order: Order): string {
    const names = order.items.slice(0, 3).map(i => i.name);
    const extra = order.items.length > 3 ? ` +${order.items.length - 3}` : '';
    return names.join(', ') + extra;
  }
}
