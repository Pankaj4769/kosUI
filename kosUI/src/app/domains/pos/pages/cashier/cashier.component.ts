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
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component'; 

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
import { CashierContextService } from '../../services/cashier-context.service';
import { OrderManagementService } from '../../../order/services/order-management.service';
import { RestaurantConfigService } from '../../../../core/services/restaurant-config.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { WaiterOrderService } from '../../../waiter/services/waiter-order.service';
import { TableSessionService, TableSession } from '../../../../core/services/table-session.service';

// Models
import { CartItem } from '../../models/cart-item.model';
import { Order, OrderStatus, OrderType as OmsOrderType, OrderPriority } from '../../../order/models/order.model';

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

  // Mobile two-page view
  mobileView: 'menu' | 'cart' = 'menu';

  // Session Info
  currentTime = new Date();
  orderNumber = '';
  sessionId = '';
  waiterName = 'Cashier';
  showWaiterInput = false;

  // KOT tracking
  kotSent = false;
  kotOrderId: number | null = null;
  kotCount = 0;

  // Active session for current table
  activeSession: TableSession | null = null;

  // KOT rounds already sent for this session (shown in cart panel)
  sessionOrders: Order[] = [];

  get sessionOrdersTotal(): number {
    return this.sessionOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }

  get billTotal(): number {
    return this.total + this.sessionOrdersTotal;
  }

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
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private cashierCtx: CashierContextService,
    private orderManagementService: OrderManagementService,
    private configService: RestaurantConfigService,
    private authService: AuthService,
    private waiterOrderSvc: WaiterOrderService,
    private sessionSvc: TableSessionService
  ) {
    this.initializeSession();
    this.listenToRoute();
  }

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.subscribeToCart();
    this.subscribeToSessionOrders();
    this.startClock();
    this.loadSavedState();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.cashierCtx.clear(); // ✅ ADD — hides bar when leaving cashier
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
    const user = this.authService.currentUser;
    if (user?.name) this.waiterName = user.name;
    this.pushContext();
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

  private subscribeToSessionOrders(): void {
    this.subscriptions.add(
      this.orderManagementService.liveOrders$.subscribe(orders => {
        const sid = this.activeSession?.sessionId;
        this.sessionOrders = sid
          ? orders.filter(o => o.sessionId === sid && o.status !== OrderStatus.CANCELLED)
          : [];
        this.cdr.markForCheck();
      })
    );
  }

  /**
   * Fetch ALL orders for the current session from the backend DB.
   * Includes orders created by waiter on any device — call before billing.
   */
  private refreshSessionOrdersFromBackend(): void {
    const sid = this.activeSession?.sessionId;
    if (!sid) return;
    this.orderManagementService.fetchSessionOrdersFromBackend(sid).subscribe({
      next: (orders) => {
        this.sessionOrders = orders.filter(
          o => o.status !== OrderStatus.CANCELLED
        );
        this.cdr.markForCheck();
      },
      error: (err) => console.warn('[Cashier] Failed to refresh session orders', err)
    });
  }

  /* ================= COMPUTED PROPERTIES ================= */

  get subtotal(): number {
    return this.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  get tax(): number {
    return this.subtotal * (this.configService.taxRate / 100);
  }

  get taxRate(): number {
    return this.configService.taxRate;
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
    this.loading       = true;
    this.error         = null;
    this.selectedTable = tableNo;

    const tableObj     = this.tableService.getTableByNumber(tableNo);
    const tableName    = tableObj?.name ?? `Table ${tableNo}`;
    const restaurantId = this.authService.currentUser?.restaurantId ?? '';
    const waiterArg    = this.waiterName !== 'Cashier' ? this.waiterName : (tableObj?.waiter ?? undefined);

    // Cache hit → fires synchronously (of()); cache miss → one DB call
    this.sessionSvc.getOrCreate(tableNo, tableName, restaurantId, waiterArg)
      .subscribe({
        next: (session) => {
          this.activeSession = session;

          if (session.waiterName) {
            this.waiterName = session.waiterName;
          } else if (tableObj?.waiter) {
            this.waiterName = tableObj.waiter;
          }

          this.kotCount = session.kotRound - 1;

          this.cartService.switchSession(this.sessionSvc.cartKey(tableNo));

          if (!this.cartService.currentCart.length) {
            const heldOrder = this.holdService.recallForTable(tableNo);
            if (heldOrder?.length) {
              this.cartService.setCart(heldOrder);
              this.showNotification('Recalled held order', 'success');
            } else if (tableObj) {
              const waiterItems = this.waiterOrderSvc.getOrderForTable(tableObj.id);
              if (waiterItems.length) {
                this.cartService.setCart(waiterItems.map(wi => ({
                  id: wi.menuItemId, name: wi.name, price: wi.price,
                  qty: wi.qty, category: wi.category, notes: wi.note || undefined
                })));
                this.showNotification('Loaded waiter order', 'info');
              }
            }
          } else {
            this.showNotification('Session restored', 'info');
          }

          // Load any KOTs already sent by waiter for this session
          if (session.kotRound > 1) {
            this.refreshSessionOrdersFromBackend();
          }

          if (this.orderType !== 'Dine-In') this.orderType = 'Dine-In';
          this.loading = false;
          this.pushContext();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Failed to load table session';
          console.error('Table load error:', err);
          this.showNotification('Error loading table', 'error');
          this.loading = false;
          this.pushContext();
          this.cdr.markForCheck();
        }
      });
  }

  private syncTableOrder(): void {
    if (this.selectedTable && this.orderType === 'Dine-In') {
      this.tableService.setOrderForTable(this.selectedTable, this.cart);
    }
  }

  // ✅ ADD — pushes current state to header, called after any context change
private pushContext(): void {
  if (this.selectedTable) {
    // ✅ Table selected — show all three chips
    this.cashierCtx.set({
      tableName:   `Table #${this.selectedTable}`,
      orderType:   this.orderType,
      orderNumber: this.orderNumber
    });
  } else {
    // ✅ No table — show only order type (tableName = null signals partial mode)
  this.cashierCtx.set({
      tableName:   '',              // empty = no table chip
      orderType:   this.orderType,
      orderNumber: ''              // empty = no order number chip
    });
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
    this.pushContext(); // Push updated context to header
    this.cdr.markForCheck();
  }

  onTableSelected(tableNo: number): void {
    if (this.selectedTable === tableNo) return;
    this.loadTable(tableNo);
  }

  onWaiterAssigned(name: string): void {
    this.waiterName = name;
    if (this.selectedTable) {
      const tableObj     = this.tableService.getTableByNumber(this.selectedTable);
      const tableName    = tableObj?.name ?? `Table ${this.selectedTable}`;
      const restaurantId = this.authService.currentUser?.restaurantId ?? '';
      this.sessionSvc.getOrCreate(this.selectedTable, tableName, restaurantId, name).subscribe();
    }
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
    // REPLACED: window.confirm with MatDialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Clear Cart?',
        message: 'Are you sure you want to clear all items from the cart?',
        confirmText: 'Yes, Clear',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.cartService.clearCart();
        this.syncTableOrder();
        this.showNotification('Cart cleared', 'info');
      }
    });
  }

  /* ================= PAYMENT ================= */

  openPayment(): void {
    if (!this.hasItems && this.sessionOrders.length === 0) {
      this.showNotification('Nothing to pay', 'error');
      return;
    }

    // Refresh from backend to include waiter orders from other devices
    this.refreshSessionOrdersFromBackend();

    if (this.requiresCustomerInfo) {
      this.showCustomerInfo = true;
      return;
    }

    this.showPayment = true;
  }

  onPaymentComplete(paymentData: any): void {
    const sessionId = this.activeSession?.sessionId;

    if (sessionId) {
      // Mark ALL session orders (any KOT round) as SERVED
      this.orderManagementService.getOrdersBySession(sessionId)
        .filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING)
        .forEach(o => this.orderManagementService.updateOrderStatus(o.id, OrderStatus.SERVED));
    } else if (this.kotSent && this.selectedTable) {
      // Fallback: scan by tableId
      const tableObj = this.tableService.getTableByNumber(this.selectedTable);
      if (tableObj) {
        this.orderManagementService.getAllOrders()
          .filter(o => o.tableId === tableObj.id &&
            (o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING))
          .forEach(o => this.orderManagementService.updateOrderStatus(o.id, OrderStatus.SERVED));
      }
    }

    // If items remain in cart (not yet KOT'd), create a direct SERVED order
    if (this.hasItems) {
      this.pushCompletedOrder(paymentData);
    }

    // Clear waiter-staged items for this table
    if (this.selectedTable) {
      const tableObj = this.tableService.getTableByNumber(this.selectedTable);
      if (tableObj) this.waiterOrderSvc.clearOrder(tableObj.id);
    }

    this.kotSent = false;
    this.kotOrderId = null;
    this.finalizeBill();
    this.showNotification('Payment successful!', 'success');
    this.showPayment = false;
  }

  private pushCompletedOrder(paymentData: any): void {
    const order = this.buildOrder(OrderStatus.SERVED);
    this.orderManagementService.addOrder(order);
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

    // Consume next KOT round from session
    const kotRound = this.selectedTable
      ? this.sessionSvc.nextKot(this.selectedTable)
      : ++this.kotCount;
    this.kotCount = this.activeSession?.kotRound
      ? this.activeSession.kotRound - 1
      : kotRound;

    const order = this.buildOrder(OrderStatus.PENDING);
    order.kotRound = kotRound;
    order.sessionId = this.activeSession?.sessionId;

    // Optimistic local add + POST to backend (SSE broadcasts to all clients)
    this.orderManagementService.sendKotOrder(order);
    if (this.selectedTable) {
      const tObj = this.tableService.getTableByNumber(this.selectedTable);
      if (tObj) {
        this.tableService.updateTableStatus(tObj.id, 'occupied');
        const prevItems  = this.sessionOrders.reduce((s, o) => s + o.items.length, 0);
        const prevAmount = this.sessionOrdersTotal;
        this.tableService.updateTableOrderInfo(tObj.id, prevItems + order.items.length, prevAmount + order.totalAmount);
      }
    }
    this.kotSent = true;
    this.kotOrderId = order.id;

    this.printKotTicket(order);

    // Clear cart so cashier can add new items for next round
    this.cartService.clearCart();
    this.orderNumber = this.generateOrderNumber();

    this.showNotification(`KOT Round ${kotRound} sent — ${order.orderNumber}`, 'success');
    this.cdr.markForCheck();
  }

  private printKotTicket(order: Order): void {
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;

    const itemsHtml = order.items.map(i =>
      `<tr>
        <td style="padding:3px 4px">${i.name}${i.notes ? `<br><em style="font-size:11px">${i.notes}</em>` : ''}</td>
        <td style="padding:3px 4px;text-align:right;font-weight:bold">x${i.quantity}</td>
      </tr>`
    ).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>KOT - ${order.orderNumber}</title>
      <style>
        body{font-family:monospace;font-size:13px;max-width:300px;margin:0 auto;padding:8px}
        h2{text-align:center;font-size:15px;margin:4px 0}
        p{margin:2px 0}
        table{width:100%;border-collapse:collapse}
        .divider{border-top:1px dashed #000;margin:6px 0}
        @media print{@page{size:80mm auto;margin:4mm}}
      </style></head><body>
      <h2>KITCHEN ORDER TICKET</h2>
      <div class="divider"></div>
      <p><strong>Order:</strong> ${order.orderNumber}</p>
      <p><strong>Type:</strong> ${order.type.replace('_', '-')}</p>
      ${order.tableName ? `<p><strong>Table:</strong> ${order.tableName}</p>` : ''}
      ${order.waiterName ? `<p><strong>Waiter:</strong> ${order.waiterName}</p>` : ''}
      <p><strong>Time:</strong> ${new Date(order.orderTime).toLocaleTimeString()}</p>
      <div class="divider"></div>
      <table>${itemsHtml}</table>
      <div class="divider"></div>
      ${order.notes ? `<p><strong>Note:</strong> ${order.notes}</p>` : ''}
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  }

  private buildOrder(status: OrderStatus): Order {
    const typeMap: Record<OrderType, OmsOrderType> = {
      'Dine-In':  OmsOrderType.DINE_IN,
      'Takeaway': OmsOrderType.TAKEAWAY,
      'Delivery': OmsOrderType.DELIVERY
    };
    const orderItems = this.cart.map((ci, idx) => ({
      id: idx + 1,
      name: ci.name,
      quantity: ci.qty,
      price: ci.price,
      notes: ci.notes || '',
      category: ci.category
    }));
    return {
      id: Date.now(),
      orderNumber: this.orderNumber,
      tableId: this.selectedTable ?? undefined,
      tableName: this.selectedTable ? `Table ${this.selectedTable}` : undefined,
      status,
      priority: OrderPriority.MEDIUM,
      type: typeMap[this.orderType] ?? OmsOrderType.DINE_IN,
      items: orderItems,
      totalAmount: orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
      customerName: this.customerInfo?.name || 'Guest',
      waiterName: this.waiterName,
      orderTime: new Date(),
      address: this.customerInfo?.address
    };
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
        // Session stays open — owner/manager closes it explicitly when table is cleared
      }
      this.resetOrder();
      this.showNotification('Order completed', 'success');
    } catch (err) {
      console.error('Finalize error:', err);
      this.showNotification('Error finalizing order', 'error');
    }
  }

  resetOrder(): void {
    // Clear session-scoped cart, then reset to default storage
    this.cartService.clearCart();
    this.cartService.switchSession('temp_cart');

    this.activeSession   = null;
    this.sessionOrders   = [];
    this.selectedTable   = null;
    this.customerInfo    = null;
    this.orderNumber     = this.generateOrderNumber();
    this.sessionId       = `SES-${Date.now()}`;
    this.kotSent         = false;
    this.kotOrderId      = null;
    this.kotCount        = 0;

    localStorage.removeItem('cashier_state');
    this.pushContext();
    this.cdr.markForCheck();
  }

  closeTable(): void {
    if (!this.selectedTable) return;

    if (this.hasItems) {
      // REPLACED: window.confirm with MatDialog
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Close Table?',
          message: 'Close table with items in cart? Items will be lost.',
          confirmText: 'Yes, Close',
          confirmColor: 'warn'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) {
          this.performCloseTable();
        }
      });
    } else {
      this.performCloseTable();
    }
  }

  private performCloseTable(): void {
    if (this.selectedTable) {
      this.holdService.clearTableHold(this.selectedTable);
      this.tableService.clearTable(this.selectedTable);
      this.resetOrder();
      this.showNotification('Table closed', 'info');
    }
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
