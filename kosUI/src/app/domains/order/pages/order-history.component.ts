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

// ✅ CHANGE 1: Update service import
import { OrderManagementService } from '../services/order-management.service';
import { Order, OrderStatus, OrderType, OrderPriority } from '../models/order.model';

interface DateRange {
  start: string;
  end: string;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderHistoryComponent implements OnInit, OnDestroy {

  OrderStatus = OrderStatus;
  OrderType = OrderType;
  OrderPriority = OrderPriority; // ✅ CHANGE 2: Add OrderPriority for template usage

  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  paginatedOrders: Order[] = [];

  searchText = '';
  selectedDateRange = 'all';
  selectedStatus = 'all';
  selectedType = 'all';
  sortBy = 'date-desc';

  customDateRange: DateRange = {
    start: '',
    end: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 25;
  totalPages = 1;
  startIndex = 0;
  endIndex = 0;

  stats = {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    completedOrders: 0
  };

  private destroy$ = new Subject<void>();

  // ✅ CHANGE 3: Update constructor to use OrderManagementService
  constructor(
    private orderManagementService: OrderManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ CHANGE 4: Update loadOrders to use completedOrders$ (for history view)
  loadOrders(): void {
    // Use completedOrders$ to show only SERVED and CANCELLED orders
    this.orderManagementService.completedOrders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.allOrders = [...orders];
        this.applyFilters();
        this.cdr.markForCheck();
      });
  }

  applyFilters(): void {
    let filtered = [...this.allOrders];

    // Search filter
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.tableName?.toLowerCase().includes(search) ||
        order.waiterName?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === this.selectedStatus);
    }

    // Type filter
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(order => order.type === this.selectedType);
    }

    // Date filter
    filtered = this.filterByDate(filtered);

    this.filteredOrders = filtered;
    this.applySorting();
    this.calculateStats();
  }

  filterByDate(orders: Order[]): Order[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (this.selectedDateRange) {
      case 'today':
        return orders.filter(order => order.orderTime >= today);

      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orders.filter(order =>
          order.orderTime >= yesterday && order.orderTime < today
        );

      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orders.filter(order => order.orderTime >= weekAgo);

      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return orders.filter(order => order.orderTime >= monthAgo);

      case 'custom':
        if (this.customDateRange.start && this.customDateRange.end) {
          const start = new Date(this.customDateRange.start);
          const end = new Date(this.customDateRange.end);
          end.setHours(23, 59, 59, 999);
          return orders.filter(order =>
            order.orderTime >= start && order.orderTime <= end
          );
        }
        return orders;

      default:
        return orders;
    }
  }

  applyDateFilter(): void {
    this.applyFilters();
  }

  applySorting(): void {
    switch (this.sortBy) {
      case 'date-desc':
        this.filteredOrders.sort((a, b) =>
          b.orderTime.getTime() - a.orderTime.getTime()
        );
        break;

      case 'date-asc':
        this.filteredOrders.sort((a, b) =>
          a.orderTime.getTime() - b.orderTime.getTime()
        );
        break;

      case 'amount-desc':
        this.filteredOrders.sort((a, b) => b.totalAmount - a.totalAmount);
        break;

      case 'amount-asc':
        this.filteredOrders.sort((a, b) => a.totalAmount - b.totalAmount);
        break;

      case 'order-number':
        this.filteredOrders.sort((a, b) =>
          a.orderNumber.localeCompare(b.orderNumber)
        );
        break;
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);
    this.startIndex = (this.currentPage - 1) * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.filteredOrders.length);

    this.paginatedOrders = this.filteredOrders.slice(this.startIndex, this.endIndex);
    this.cdr.markForCheck();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  calculateStats(): void {
    const totalOrders = this.filteredOrders.length;
    const totalRevenue = this.filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedOrders = this.filteredOrders.filter(
      o => o.status === OrderStatus.SERVED
    ).length;

    this.stats = {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      completedOrders
    };
  }

  getItemsTooltip(order: Order): string {
    return order.items.map(item => `${item.quantity}x ${item.name}`).join('\n');
  }

  viewOrderDetails(order: Order): void {
    alert(`Order Details:\n\n${JSON.stringify(order, null, 2)}`);
  }

  printReceipt(order: Order): void {
    console.log('Print receipt for:', order.orderNumber);
    alert(`Printing receipt for ${order.orderNumber}`);
  }

  // ✅ CHANGE 5: Enhanced exportToCSV with Priority column
  exportToCSV(): void {
    const headers = [
      'Order Number', 
      'Date', 
      'Time', 
      'Customer', 
      'Table', 
      'Type', 
      'Items', 
      'Amount', 
      'Status', 
      'Waiter',
      'Priority' // ✅ Added Priority column
    ];
    
    const rows = this.filteredOrders.map(order => [
      order.orderNumber,
      new Date(order.orderTime).toLocaleDateString(),
      new Date(order.orderTime).toLocaleTimeString(),
      order.customerName || '',
      order.tableName || '',
      order.type,
      order.items.length,
      order.totalAmount,
      order.status,
      order.waiterName || '',
      order.priority // ✅ Added Priority value
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  trackById(index: number, order: Order): number {
    return order.id;
  }

  // ✅ OPTIONAL ADDITION: Refresh orders method
  refreshOrders(): void {
    this.orderManagementService.refreshAllOrders();
  }

  // ✅ OPTIONAL ADDITION: Update order status (if you add edit functionality later)
  updateOrderStatus(orderId: number, status: OrderStatus): void {
    this.orderManagementService.updateOrderStatus(orderId, status);
  }

  // ✅ OPTIONAL ADDITION: Delete order (if you add delete functionality later)
  deleteOrder(orderId: number): void {
    if (confirm('Are you sure you want to delete this order?')) {
      this.orderManagementService.deleteOrder(orderId);
    }
  }
}
