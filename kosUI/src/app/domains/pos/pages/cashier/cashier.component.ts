import { 
  Component, 
  OnDestroy, 
  OnInit, 
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef 
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

// Angular Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

// Components
import { OrderSidebarComponent } from '../../components/order-sidebar/order-sidebar.component';
import { HoldOrdersComponent } from '../../components/hold-orders.component/hold-orders.component';
import { PaymentPopupComponent } from '../../components/payment-popup/payment-popup.component';
import { MenuAreaComponent } from '../../components/menu-area/menu-area.component';
import { CartPanelComponent } from '../../components/cart-panel/cart-panel.component';

// Services
import { TableService } from '../../services/table.service';
import { HoldService } from '../../services/hold.service';
import { CartService } from '../../services/cart.service';

// Models
import { CartItem } from '../../models/cart-item.model';

/* ================= TYPES ================= */

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
}

export interface OrderSession {
  sessionId: string;
  startTime: Date;
  waiterName: string;
  tableNo?: number;
  orderType: OrderType;
}

/* ================= COMPONENT ================= */

@Component({
  selector: 'app-cashier',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    OrderSidebarComponent,
    MenuAreaComponent,
    CartPanelComponent,
    HoldOrdersComponent,
    PaymentPopupComponent
  ],
  templateUrl: './cashier.component.html',
  styleUrls: ['./cashier.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashierComponent implements OnInit, OnDestroy {

  /* ================= STATE ================= */

  cart: CartItem[] = [];
  selectedTable: number | null = null;
  orderType: OrderType = 'Dine-In';
  
  // UI States
  showPayment = false;
  showHoldOrders = false;
  showCustomerInfo = false;
  showNotifications = false;
  loading = false;
  error: string | null = null;

  // Session Info
  currentTime = new Date();
  orderNumber = '';
  sessionId = '';
  waiterName = 'Cashier';

  // Customer Info
  customerInfo: CustomerInfo | null = null;

  // Notifications
  notifications: { id: number; message: string; type: 'success' | 'error' | 'info' }[] = [];
  notificationCount = 0;

  private subscriptions = new Subscription();

  /* ================= CONSTRUCTOR ================= */

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tableService: TableService,
    private holdService: HoldService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeSession();
    this.listenToRoute();
  }

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.subscribeToCart();
    this.startClock();
    this.loadSavedState();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.saveState();
  }

  /* ================= KEYBOARD SHORTCUTS ================= */

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    // F2 - Hold Order
    if (event.key === 'F2') {
      event.preventDefault();
      this.holdOrder();
    }

    // F3 - Payment
    if (event.key === 'F3') {
      event.preventDefault();
      this.openPayment();
    }

    // F4 - Print KOT
    if (event.key === 'F4') {
      event.preventDefault();
      this.printKOT();
    }

    // Ctrl+N - New Order
    if (event.ctrlKey && event.key === 'n') {
      event.preventDefault();
      this.resetOrder();
    }

    // Ctrl+S - Save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.saveOrder();
    }

    // Ctrl+Delete - Clear Cart
    if (event.ctrlKey && event.key === 'Delete') {
      event.preventDefault();
      this.clearCart();
    }

    // Escape - Close Modals
    if (event.key === 'Escape') {
      this.showPayment = false;
      this.showHoldOrders = false;
      this.showCustomerInfo = false;
      this.showNotifications = false;
      this.cdr.markForCheck();
    }
  }

  /* ================= INITIALIZATION ================= */

  private initializeSession(): void {
    this.sessionId = `SES-${Date.now()}`;
    this.orderNumber = this.generateOrderNumber();
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    return `ORD-${timestamp}`;
  }

  /* ================= CLOCK ================= */

  private startClock(): void {
    this.subscriptions.add(
      interval(1000).subscribe(() => {
        this.currentTime = new Date();
        this.cdr.markForCheck();
      })
    );
  }

  /* ================= ROUTE HANDLING ================= */

  private listenToRoute(): void {
    this.subscriptions.add(
      this.route.queryParams.subscribe(params => {
        const tableNo = Number(params['table']);
        if (!isNaN(tableNo) && tableNo > 0) {
          this.loadTable(tableNo);
        }
      })
    );
  }

  /* ================= CART SUBSCRIPTION ================= */

  private subscribeToCart(): void {
    this.subscriptions.add(
      this.cartService.cart$.subscribe(cart => {
        this.cart = cart;
        this.cdr.markForCheck();
      })
    );
  }

  /* ================= COMPUTED PROPERTIES ================= */

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  get tax(): number {
    return this.subtotal * 0.05;
  }

  get discount(): number {
    return 0;
  }

  get total(): number {
    return this.subtotal + this.tax - this.discount;
  }

  get hasItems(): boolean {
    return this.cart.length > 0;
  }

  get itemCount(): number {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  get requiresCustomerInfo(): boolean {
    return (this.orderType === 'Delivery' || this.orderType === 'Takeaway') && !this.customerInfo;
  }

  get formattedTime(): string {
    return this.currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  get formattedDate(): string {
    return this.currentTime.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /* ================= HELPER METHODS (PUBLIC) ================= */

  getOrderTypeIcon(type: OrderType): string {
    switch (type) {
      case 'Dine-In': return 'restaurant';
      case 'Takeaway': return 'shopping_bag';
      case 'Delivery': return 'delivery_dining';
      default: return 'restaurant';
    }
  }

  getNotificationIcon(type: 'success' | 'error' | 'info'): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  trackByNotificationId(index: number, item: { id: number }): number {
    return item.id;
  }

  /* ================= TABLE MANAGEMENT ================= */

  private loadTable(tableNo: number): void {
    this.loading = true;
    this.error = null;

    try {
      this.selectedTable = tableNo;

      const heldOrder = this.holdService.recallForTable(tableNo);
      if (heldOrder?.length) {
        this.cartService.setCart(heldOrder);
        this.showNotification('Recalled held order', 'success');
      } else {
        const tableOrder = this.tableService.getOrderForTable(tableNo);
        if (tableOrder?.length) {
          this.cartService.setCart(tableOrder);
          this.showNotification('Loaded table order', 'info');
        }
      }

      if (this.orderType !== 'Dine-In') {
        this.orderType = 'Dine-In';
      }

    } catch (err) {
      this.error = 'Failed to load table data';
      console.error('Table load error:', err);
      this.showNotification('Error loading table', 'error');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private syncTableOrder(): void {
    if (this.selectedTable && this.orderType === 'Dine-In') {
      this.tableService.setOrderForTable(this.selectedTable, this.cart);
    }
  }

  /* ================= ORDER TYPE ================= */

  onOrderTypeChange(type: OrderType): void {
    this.orderType = type;

    if (type !== 'Dine-In') {
      this.selectedTable = null;
    }

    if (type === 'Dine-In') {
      this.customerInfo = null;
    }

    this.cdr.markForCheck();
  }

  onTableSelected(tableNo: number): void {
    if (this.selectedTable === tableNo) return;
    this.loadTable(tableNo);
  }

  /* ================= CART OPERATIONS ================= */

  onItemAdd(item: Omit<CartItem, 'qty'>): void {
    this.cartService.addItem({
      ...item,
      qty: 1,
      id: item.id
    } as CartItem);

    this.syncTableOrder();
    this.showNotification(`${item.name} added`, 'success');
  }

  onCartUpdate(cart: CartItem[]): void {
    this.cartService.setCart(cart);
    this.syncTableOrder();
  }

  onItemRemove(itemId: number): void {
    this.cartService.removeItem(itemId);
    this.syncTableOrder();
    this.showNotification('Item removed', 'info');
  }

  clearCart(): void {
    if (!confirm('Clear all items from cart?')) return;
    
    this.cartService.clearCart();
    this.syncTableOrder();
    this.showNotification('Cart cleared', 'info');
  }

  /* ================= PAYMENT ================= */

  openPayment(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }

    if (this.requiresCustomerInfo) {
      this.showCustomerInfo = true;
      return;
    }

    this.showPayment = true;
  }

  onPaymentComplete(paymentData: any): void {
    console.log('Payment completed:', paymentData);
    
    this.finalizeBill();
    
    this.showNotification('Payment successful!', 'success');
    this.showPayment = false;
  }

  onPaymentCancel(): void {
    this.showPayment = false;
  }

  /* ================= CUSTOMER INFO ================= */

  onCustomerInfoSubmit(formData: CustomerInfo): void {
    this.customerInfo = formData;
    this.showCustomerInfo = false;
    this.showPayment = true;
  }

  /* ================= HOLD ORDER ================= */

  holdOrder(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }

    try {
      if (this.selectedTable) {
        this.holdService.holdForTable(this.selectedTable, this.cart);
        this.showNotification(`Order held for Table ${this.selectedTable}`, 'success');
      } else {
        this.holdService.holdGlobal(this.cart);
        this.showNotification('Order held', 'success');
      }

      this.resetOrder();
    } catch (err) {
      console.error('Hold error:', err);
      this.showNotification('Failed to hold order', 'error');
    }
  }

  showHeldOrders(): void {
    this.showHoldOrders = true;
  }

  // ✅ FIXED: Accept both CartItem[] and HeldOrder object
  recallOrder(data: CartItem[] | any): void {
    // Handle both CartItem[] and HeldOrder object
    let cart: CartItem[];
    
    if (Array.isArray(data)) {
      // Direct CartItem[] array
      cart = data;
    } else if (data && data.items) {
      // HeldOrder object with items property
      cart = data.items;
      
      // Restore additional order context if available
      if (data.tableNumber) {
        this.selectedTable = data.tableNumber;
      }
      if (data.orderType) {
        this.orderType = data.orderType;
      }
      if (data.customerInfo) {
        this.customerInfo = data.customerInfo;
      }
      if (data.orderNumber) {
        this.orderNumber = data.orderNumber;
      }
    } else {
      this.showNotification('Invalid order data', 'error');
      return;
    }

    if (!cart || cart.length === 0) {
      this.showNotification('No items to recall', 'error');
      return;
    }

    this.cartService.setCart([...cart]);
    this.syncTableOrder();
    this.showNotification('Order recalled', 'success');
    this.showHoldOrders = false;
    this.cdr.markForCheck();
  }

  /* ================= KOT ================= */

  printKOT(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }

    console.log('Printing KOT...');
    console.log('Order Number:', this.orderNumber);
    console.log('Table:', this.selectedTable);
    console.log('Items:', this.cart);

    this.showNotification('KOT sent to kitchen', 'success');
  }

  saveOrder(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }

    this.saveState();
    this.showNotification('Order saved', 'success');
  }

  /* ================= FINALIZE & RESET ================= */

  finalizeBill(): void {
    try {
      if (this.selectedTable) {
        this.holdService.clearTableHold(this.selectedTable);
        this.tableService.clearTable(this.selectedTable);
      }

      this.resetOrder();
      
      this.showNotification('Order completed', 'success');
    } catch (err) {
      console.error('Finalize error:', err);
      this.showNotification('Error finalizing order', 'error');
    }
  }

  resetOrder(): void {
    this.cartService.clearCart();
    this.selectedTable = null;
    this.customerInfo = null;
    this.orderNumber = this.generateOrderNumber();
    this.sessionId = `SES-${Date.now()}`;
    
    // Clear saved state
    localStorage.removeItem('cashier_state');
    
    this.cdr.markForCheck();
  }

  closeTable(): void {
    if (!this.selectedTable) return;

    if (this.hasItems) {
      if (!confirm('Close table with items in cart? Items will be lost.')) {
        return;
      }
    }

    this.holdService.clearTableHold(this.selectedTable);
    this.tableService.clearTable(this.selectedTable);
    this.resetOrder();
    this.showNotification('Table closed', 'info');
  }

  /* ================= NOTIFICATIONS ================= */

  showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const id = ++this.notificationCount;
    this.notifications.push({ id, message, type });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.dismissNotification(id);
    }, 5000);

    this.cdr.markForCheck();
  }

  dismissNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.cdr.markForCheck();
  }

  /* ================= STATE MANAGEMENT ================= */

  private saveState(): void {
    const state = {
      cart: this.cart,
      selectedTable: this.selectedTable,
      orderType: this.orderType,
      customerInfo: this.customerInfo,
      orderNumber: this.orderNumber,
      sessionId: this.sessionId
    };

    localStorage.setItem('cashier_state', JSON.stringify(state));
  }

  private loadSavedState(): void {
    const savedState = localStorage.getItem('cashier_state');
    if (!savedState) return;

    try {
      const state = JSON.parse(savedState);
      
      if (state.cart?.length) {
        this.cartService.setCart(state.cart);
      }
      
      if (state.selectedTable) {
        this.selectedTable = state.selectedTable;
      }
      
      if (state.orderType) {
        this.orderType = state.orderType;
      }
      
      if (state.customerInfo) {
        this.customerInfo = state.customerInfo;
      }
      
      if (state.orderNumber) {
        this.orderNumber = state.orderNumber;
      }
      
      if (state.sessionId) {
        this.sessionId = state.sessionId;
      }

      this.cdr.markForCheck();
    } catch (err) {
      console.error('Failed to load saved state:', err);
    }
  }

  refreshData(): void {
    this.loadSavedState();
    this.showNotification('Data refreshed', 'info');
  }
}
