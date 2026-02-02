import { 
  Component, 
  Output, 
  EventEmitter, 
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';

// Models
import { CartItem } from '../../models/cart-item.model';

/* ================= TYPES ================= */

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';

export interface HeldOrder {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  tableNumber?: number;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  createdAt: Date;
  heldBy: string;
  notes?: string;
}

/* ================= COMPONENT ================= */

@Component({
  selector: 'app-hold-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatBadgeModule,
    MatMenuModule,
    MatChipsModule
  ],
  templateUrl: './hold-orders.component.html',
  styleUrls: ['./hold-orders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HoldOrdersComponent implements OnInit {

  /* ================= OUTPUTS ================= */

  @Output() close = new EventEmitter<void>();
  @Output() recallOrder = new EventEmitter<HeldOrder>();
  @Output() deleteOrder = new EventEmitter<string>();

  /* ================= STATE ================= */

  heldOrders: HeldOrder[] = [];
  filteredOrders: HeldOrder[] = [];
  
  // Filters
  selectedFilter: 'all' | 'dine-in' | 'takeaway' | 'delivery' = 'all';
  searchQuery = '';
  sortBy: 'recent' | 'oldest' | 'amount' = 'recent';
  
  // UI States
  loading = false;
  viewMode: 'grid' | 'list' = 'grid';
  selectedOrderId: string | null = null;
  showDetailsPanel = false;

  /* ================= CONSTRUCTOR ================= */

  constructor(private cdr: ChangeDetectorRef) {}

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.loadHeldOrders();
  }

  /* ================= INITIALIZATION ================= */

  private loadHeldOrders(): void {
    this.loading = true;

    try {
      // Mock data - Replace with actual service call
      this.heldOrders = this.getMockHeldOrders();
      this.applyFilters();
    } catch (err) {
      console.error('Failed to load held orders:', err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private getMockHeldOrders(): HeldOrder[] {
    const now = new Date();
    
    return [
      {
        id: 'hold-001',
        orderNumber: 'ORD-2026-001',
        orderType: 'Dine-In',
        tableNumber: 5,
        items: [
          {
            id: 1,
            name: 'Paneer Tikka',
            price: 249,
            qty: 2,
            portion: 'Full',
            category: 'Starters'
          },
          {
            id: 2,
            name: 'Butter Chicken',
            price: 349,
            qty: 1,
            portion: 'Full',
            category: 'Main Course'
          },
          {
            id: 3,
            name: 'Garlic Naan',
            price: 49,
            qty: 3,
            category: 'Breads'
          }
        ],
        subtotal: 994,
        tax: 50,
        discount: 0,
        total: 1044,
        createdAt: new Date(now.getTime() - 15 * 60000), // 15 mins ago
        heldBy: 'Rahul',
        notes: 'Customer waiting for friend'
      },
      {
        id: 'hold-002',
        orderNumber: 'ORD-2026-002',
        orderType: 'Takeaway',
        customerName: 'Priya Sharma',
        customerPhone: '+91 98765 43210',
        items: [
          {
            id: 4,
            name: 'Veg Biryani',
            price: 249,
            qty: 2,
            category: 'Rice'
          },
          {
            id: 5,
            name: 'Raita',
            price: 30,
            qty: 2,
            category: 'Sides'
          }
        ],
        subtotal: 558,
        tax: 28,
        discount: 50,
        total: 536,
        createdAt: new Date(now.getTime() - 30 * 60000), // 30 mins ago
        heldBy: 'Amit',
        notes: 'Will pick up in 15 minutes'
      },
      {
        id: 'hold-003',
        orderNumber: 'ORD-2026-003',
        orderType: 'Dine-In',
        tableNumber: 12,
        items: [
          {
            id: 6,
            name: 'Chicken 65',
            price: 299,
            qty: 1,
            portion: 'Half',
            category: 'Starters'
          },
          {
            id: 7,
            name: 'Dal Makhani',
            price: 199,
            qty: 1,
            category: 'Main Course'
          },
          {
            id: 8,
            name: 'Butter Naan',
            price: 39,
            qty: 2,
            category: 'Breads'
          },
          {
            id: 9,
            name: 'Mango Lassi',
            price: 89,
            qty: 2,
            category: 'Beverages'
          }
        ],
        subtotal: 754,
        tax: 38,
        discount: 0,
        total: 792,
        createdAt: new Date(now.getTime() - 45 * 60000), // 45 mins ago
        heldBy: 'Sneha'
      },
      {
        id: 'hold-004',
        orderNumber: 'ORD-2026-004',
        orderType: 'Delivery',
        customerName: 'Rajesh Kumar',
        customerPhone: '+91 87654 32109',
        items: [
          {
            id: 10,
            name: 'Paneer Butter Masala',
            price: 299,
            qty: 1,
            portion: 'Full',
            category: 'Main Course'
          },
          {
            id: 11,
            name: 'Chicken Biryani',
            price: 299,
            qty: 1,
            category: 'Rice'
          },
          {
            id: 12,
            name: 'Gulab Jamun',
            price: 79,
            qty: 1,
            category: 'Desserts'
          }
        ],
        subtotal: 677,
        tax: 34,
        discount: 0,
        total: 711,
        createdAt: new Date(now.getTime() - 60 * 60000), // 1 hour ago
        heldBy: 'Rahul',
        notes: 'Delivery address: 123 MG Road, Bangalore'
      },
      {
        id: 'hold-005',
        orderNumber: 'ORD-2026-005',
        orderType: 'Dine-In',
        tableNumber: 8,
        items: [
          {
            id: 13,
            name: 'French Fries',
            price: 129,
            qty: 2,
            category: 'Starters'
          },
          {
            id: 14,
            name: 'Cold Coffee',
            price: 99,
            qty: 3,
            category: 'Beverages'
          }
        ],
        subtotal: 555,
        tax: 28,
        discount: 55,
        total: 528,
        createdAt: new Date(now.getTime() - 10 * 60000), // 10 mins ago
        heldBy: 'Amit',
        notes: 'Group of college students'
      }
    ];
  }

  /* ================= COMPUTED PROPERTIES ================= */

  get totalHeldOrders(): number {
    return this.heldOrders.length;
  }

  get totalHeldAmount(): number {
    return this.heldOrders.reduce((sum, order) => sum + order.total, 0);
  }

  get selectedOrder(): HeldOrder | null {
    if (!this.selectedOrderId) return null;
    return this.heldOrders.find(o => o.id === this.selectedOrderId) || null;
  }

  /* ================= FILTERING ================= */

  applyFilters(): void {
    let filtered = [...this.heldOrders];

    // Type filter
    if (this.selectedFilter !== 'all') {
      const filterMap: { [key: string]: OrderType } = {
        'dine-in': 'Dine-In',
        'takeaway': 'Takeaway',
        'delivery': 'Delivery'
      };
      filtered = filtered.filter(order => order.orderType === filterMap[this.selectedFilter]);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerPhone?.includes(query) ||
        order.tableNumber?.toString().includes(query) ||
        order.heldBy.toLowerCase().includes(query)
      );
    }

    // Sorting
    this.applySorting(filtered);

    this.filteredOrders = filtered;
    this.cdr.markForCheck();
  }

  private applySorting(orders: HeldOrder[]): void {
    switch (this.sortBy) {
      case 'recent':
        orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'amount':
        orders.sort((a, b) => b.total - a.total);
        break;
    }
  }

  selectFilter(filter: 'all' | 'dine-in' | 'takeaway' | 'delivery'): void {
    this.selectedFilter = filter;
    this.applyFilters();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  changeSortBy(sortBy: 'recent' | 'oldest' | 'amount'): void {
    this.sortBy = sortBy;
    this.applyFilters();
  }

  /* ================= VIEW MODE ================= */

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  /* ================= ORDER SELECTION ================= */

  selectOrder(orderId: string): void {
    this.selectedOrderId = orderId;
    this.showDetailsPanel = true;
    this.cdr.markForCheck();
  }

  closeDetailsPanel(): void {
    this.showDetailsPanel = false;
    this.selectedOrderId = null;
    this.cdr.markForCheck();
  }

  /* ================= ORDER ACTIONS ================= */

  onRecallOrder(order: HeldOrder): void {
    if (confirm(`Recall order ${order.orderNumber}?`)) {
      this.recallOrder.emit(order);
    }
  }

  onDeleteOrder(orderId: string, orderNumber: string): void {
    if (confirm(`Delete held order ${orderNumber}? This action cannot be undone.`)) {
      this.deleteOrder.emit(orderId);
      
      // Remove from local state
      this.heldOrders = this.heldOrders.filter(o => o.id !== orderId);
      
      if (this.selectedOrderId === orderId) {
        this.closeDetailsPanel();
      }
      
      this.applyFilters();
    }
  }

  /* ================= TIME HELPERS ================= */

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  getOrderAge(date: Date): { value: number; unit: string; isOld: boolean } {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return { value: diffMins, unit: 'min', isOld: diffMins > 45 };
    }
    
    const diffHours = Math.floor(diffMins / 60);
    return { value: diffHours, unit: 'hr', isOld: diffHours > 2 };
  }

  /* ================= HELPERS ================= */

  formatCurrency(amount: number): string {
    return `₹${amount.toFixed(0)}`;
  }

  getOrderTypeIcon(type: OrderType): string {
    switch (type) {
      case 'Dine-In': return 'restaurant';
      case 'Takeaway': return 'shopping_bag';
      case 'Delivery': return 'delivery_dining';
      default: return 'receipt';
    }
  }

  getOrderTypeColor(type: OrderType): string {
    switch (type) {
      case 'Dine-In': return '#2e7d32';
      case 'Takeaway': return '#ff9800';
      case 'Delivery': return '#1976d2';
      default: return '#6b7280';
    }
  }

  trackByOrderId(index: number, order: HeldOrder): string {
    return order.id;
  }

  /* ================= REFRESH ================= */

  refreshOrders(): void {
    this.loadHeldOrders();
  }

  /* ================= CLOSE ================= */

  onClose(): void {
    this.close.emit();
  }
}
