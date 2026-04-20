import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../common-popup/pages/confirm-dialog.component';
import { OrderManagementService } from '../services/order-management.service';
import { Order, OrderStatus, OrderType, OrderPriority, PaymentStatus } from '../models/order.model';

interface DateRange {
  start: string;
  end: string;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderHistoryComponent implements OnInit, OnDestroy {

  readonly OrderStatus   = OrderStatus;
  readonly OrderType     = OrderType;
  readonly OrderPriority = OrderPriority;
  readonly PaymentStatus = PaymentStatus;

  allOrders:       Order[] = [];
  filteredOrders:  Order[] = [];
  paginatedOrders: Order[] = [];

  searchText            = '';
  selectedDateRange     = 'all';
  selectedStatus        = 'all';
  selectedType          = 'all';
  selectedPaymentStatus = 'all';
  sortBy                = 'date-desc';

  customDateRange: DateRange = { start: '', end: '' };

  // Pagination
  currentPage = 1;
  pageSize    = 25;
  totalPages  = 1;
  startIndex  = 0;
  endIndex    = 0;

  stats = {
    totalOrders:     0,
    totalRevenue:    0,
    paidRevenue:     0,
    avgOrderValue:   0,
    completedOrders: 0,
    cancelledOrders: 0
  };

  selectedOrder: Order | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private orderManagementService: OrderManagementService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.orderManagementService.completedOrders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.allOrders = [...orders];
        this.applyFilters();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Filters ────────────────────────────────────────────

  applyFilters(): void {
    let filtered = [...this.allOrders];

    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.tableName?.toLowerCase().includes(q) ||
        o.waiterName?.toLowerCase().includes(q)
      );
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(o => o.status === this.selectedStatus);
    }

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(o => o.type === this.selectedType);
    }

    if (this.selectedPaymentStatus !== 'all') {
      filtered = filtered.filter(o =>
        (o.paymentStatus ?? PaymentStatus.PENDING) === this.selectedPaymentStatus
      );
    }

    filtered = this.filterByDate(filtered);

    this.filteredOrders = filtered;
    this.applySorting();
    this.calculateStats();
  }

  applyDateFilter(): void { this.applyFilters(); }

  filterByDate(orders: Order[]): Order[] {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (this.selectedDateRange) {
      case 'today':
        return orders.filter(o => o.orderTime >= today);

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orders.filter(o => o.orderTime >= yesterday && o.orderTime < today);
      }

      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orders.filter(o => o.orderTime >= weekAgo);
      }

      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return orders.filter(o => o.orderTime >= monthStart);
      }

      case 'custom':
        if (this.customDateRange.start && this.customDateRange.end) {
          const start = new Date(this.customDateRange.start);
          const end   = new Date(this.customDateRange.end);
          end.setHours(23, 59, 59, 999);
          return orders.filter(o => o.orderTime >= start && o.orderTime <= end);
        }
        return orders;

      default:
        return orders;
    }
  }

  hasActiveFilters(): boolean {
    return this.searchText.trim() !== ''
      || this.selectedDateRange     !== 'all'
      || this.selectedStatus        !== 'all'
      || this.selectedType          !== 'all'
      || this.selectedPaymentStatus !== 'all';
  }

  clearFilters(): void {
    this.searchText            = '';
    this.selectedDateRange     = 'all';
    this.selectedStatus        = 'all';
    this.selectedType          = 'all';
    this.selectedPaymentStatus = 'all';
    this.customDateRange       = { start: '', end: '' };
    this.sortBy                = 'date-desc';
    this.applyFilters();
  }

  // ── Sorting & pagination ───────────────────────────────

  applySorting(): void {
    switch (this.sortBy) {
      case 'date-desc':
        this.filteredOrders.sort((a, b) => b.orderTime.getTime() - a.orderTime.getTime());
        break;
      case 'date-asc':
        this.filteredOrders.sort((a, b) => a.orderTime.getTime() - b.orderTime.getTime());
        break;
      case 'amount-desc':
        this.filteredOrders.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case 'amount-asc':
        this.filteredOrders.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      case 'order-number':
        this.filteredOrders.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
        break;
    }
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
    this.startIndex = (this.currentPage - 1) * this.pageSize;
    this.endIndex   = Math.min(this.startIndex + this.pageSize, this.filteredOrders.length);
    this.paginatedOrders = this.filteredOrders.slice(this.startIndex, this.endIndex);
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage():     void { this.goToPage(this.currentPage + 1); }
  previousPage(): void { this.goToPage(this.currentPage - 1); }

  changePageSize(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end   = Math.min(this.totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Stats ──────────────────────────────────────────────

  calculateStats(): void {
    const orders = this.filteredOrders;
    this.stats = {
      totalOrders:     orders.length,
      totalRevenue:    orders.reduce((s, o) => s + o.totalAmount, 0),
      paidRevenue:     orders
        .filter(o => o.paymentStatus === PaymentStatus.PAID || o.paymentStatus === PaymentStatus.PARTIALLY_PAID)
        .reduce((s, o) => s + o.totalAmount, 0),
      avgOrderValue:   orders.length > 0
        ? orders.reduce((s, o) => s + o.totalAmount, 0) / orders.length
        : 0,
      completedOrders: orders.filter(o => o.status === OrderStatus.SERVED).length,
      cancelledOrders: orders.filter(o => o.status === OrderStatus.CANCELLED).length
    };
  }

  // ── Modal ──────────────────────────────────────────────

  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
    this.cdr.markForCheck();
  }

  closeDetails(): void {
    this.selectedOrder = null;
    this.cdr.markForCheck();
  }

  // ── Actions ────────────────────────────────────────────

  refreshOrders(): void {
    this.orderManagementService.refreshAllOrders();
  }

  printReceipt(order: Order): void {
    console.log('Print receipt:', order.orderNumber);
    alert(`Printing receipt for ${order.orderNumber}`);
  }

  deleteOrder(orderId: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title:        'Delete Order',
        message:      'Are you sure you want to delete this order? This action cannot be undone.',
        confirmText:  'Delete',
        confirmColor: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.orderManagementService.deleteOrder(orderId);
        if (this.selectedOrder?.id === orderId) this.closeDetails();
      }
    });
  }

  // ── Display helpers ────────────────────────────────────

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      [OrderType.DINE_IN]:  '🍽️',
      [OrderType.TAKEAWAY]: '🥡',
      [OrderType.DELIVERY]: '🛵'
    };
    return icons[type] ?? '📋';
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      [OrderType.DINE_IN]:  'Dine-In',
      [OrderType.TAKEAWAY]: 'Takeaway',
      [OrderType.DELIVERY]: 'Delivery'
    };
    return labels[type] ?? type;
  }

  formatPayment(status: string | undefined): string {
    if (!status) return 'Pending';
    return status.replace(/_/g, ' ');
  }

  trackById(_: number, order: Order): number {
    return order.id;
  }

  exportToCSV(): void {
    const escapeCsv = (value: unknown): string => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Order Number', 'Date', 'Time', 'Customer', 'Table', 'Type',
      'Items', 'Amount', 'Status', 'Waiter', 'Priority',
      'Payment Status', 'Payment Date', 'Payment Time'
    ];
    const rows = this.filteredOrders.map(o => [
      o.orderNumber,
      new Date(o.orderTime).toLocaleDateString(),
      new Date(o.orderTime).toLocaleTimeString(),
      o.customerName || '',
      o.tableName    || '',
      o.type,
      o.items.length,
      o.totalAmount,
      o.status,
      o.waiterName   || '',
      o.priority,
      o.paymentStatus ?? PaymentStatus.PENDING,
      o.paymentDate ? new Date(o.paymentDate).toLocaleDateString()  : '',
      o.paymentDate ? new Date(o.paymentDate).toLocaleTimeString() : ''
    ]);

    const csv  = [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `order-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
