import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatIconModule }    from '@angular/material/icon';
import { MatButtonModule }  from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule }    from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Components
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component';
import { HoldOrdersComponent }    from '../../components/hold-orders.component/hold-orders.component';
import { PaymentPopupComponent }  from '../../components/payment-popup/payment-popup.component';

// Services
import { HoldService }    from '../../services/hold.service';
import { CartService }    from '../../services/cart.service';
import { TableService }   from '../../services/table.service';

// Models
import { CartItem } from '../../models/cart-item.model';

/* ================= TYPES ================= */

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';

export interface CustomerInfo {
  name:     string;
  phone:    string;
  address?: string;
  email?:   string;
}

/* ================= COMPONENT ================= */

@Component({
  selector: 'app-cart-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    HoldOrdersComponent,
    PaymentPopupComponent
  ],
  templateUrl: './cart-panel.component.html',
  styleUrls: ['./cart-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPanelComponent implements OnInit, OnChanges {

  /* ================= INPUTS ================= */

  @Input() cart: CartItem[]           = [];
  @Input() subtotal: number           = 0;
  @Input() tax: number                = 0;
  @Input() discount: number           = 0;
  @Input() total: number              = 0;
  @Input() orderType: OrderType       = 'Dine-In';
  @Input() tableNumber: number | null = null;

  /* ================= OUTPUTS ================= */

  @Output() cartUpdate = new EventEmitter<CartItem[]>();
  @Output() itemRemove = new EventEmitter<number>();
  @Output() checkout   = new EventEmitter<void>();

  /* ================= STATE ================= */

  editingItemId: number | null      = null;
  editingQuantity: number           = 0;
  selectedItems                     = new Set<number>();
  showNotes                         = new Map<number, boolean>();

  showHoldOrders: boolean           = false;
  showPayment: boolean              = false;
  showCustomerInfo: boolean         = false;

  orderNumber: string               = '';
  sessionId: string                 = `SES-${Date.now()}`;
  customerInfo: CustomerInfo | null = null;

  notifications: {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }[] = [];

  private notificationCount = 0;

  /* ================= CONSTRUCTOR ================= */

  constructor(
    private cdr:          ChangeDetectorRef,
    private holdService:  HoldService,
    private cartService:  CartService,
    private tableService: TableService,
    private dialog:       MatDialog
  ) {
    this.orderNumber = this.generateOrderNumber();
  }

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.loadSavedState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cart']) {
      if (this.editingItemId && !this.cart.find(i => i.id === this.editingItemId)) {
        this.cancelEdit();
      }
    }
  }

  /* ================= COMPUTED PROPERTIES ================= */

  get hasItems(): boolean {
    return this.cart.length > 0;
  }

  get totalItems(): number {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  get selectedItemsCount(): number {
    return this.selectedItems.size;
  }

  get canCheckout(): boolean {
    return this.hasItems && this.total > 0;
  }

  get requiresCustomerInfo(): boolean {
    return (this.orderType === 'Delivery' || this.orderType === 'Takeaway')
      && !this.customerInfo;
  }

  /* ================= QUANTITY MANAGEMENT ================= */

  incrementQuantity(item: CartItem): void {
    const updatedCart = this.cart.map(i =>
      i.id === item.id ? { ...i, qty: i.qty + 1 } : i
    );
    this.cartUpdate.emit(updatedCart);
  }

  decrementQuantity(item: CartItem): void {
    if (item.qty <= 1) {
      this.removeItem(item.id);
      return;
    }
    const updatedCart = this.cart.map(i =>
      i.id === item.id ? { ...i, qty: i.qty - 1 } : i
    );
    this.cartUpdate.emit(updatedCart);
  }

  startEditQuantity(item: CartItem): void {
    this.editingItemId   = item.id;
    this.editingQuantity = item.qty;
    this.cdr.markForCheck();
  }

  saveEditQuantity(): void {
    if (this.editingItemId === null) return;
    const qty = Math.max(1, Math.floor(this.editingQuantity));
    const updatedCart = this.cart.map(i =>
      i.id === this.editingItemId ? { ...i, qty } : i
    );
    this.cartUpdate.emit(updatedCart);
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingItemId   = null;
    this.editingQuantity = 0;
    this.cdr.markForCheck();
  }

  /* ================= ITEM MANAGEMENT ================= */

  removeItem(itemId: number): void {
    this.itemRemove.emit(itemId);
    this.selectedItems.delete(itemId);
  }

  removeSelectedItems(): void {
    if (this.selectedItems.size === 0) return;
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title:        'Remove Items?',
        message:      `Remove ${this.selectedItems.size} selected items?`,
        confirmText:  'Yes, Remove',
        confirmColor: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.selectedItems.forEach(id => this.itemRemove.emit(id));
        this.selectedItems.clear();
        this.cdr.markForCheck();
      }
    });
  }

  duplicateItem(item: CartItem): void {
    const newItem     = { ...item, id: Date.now() };
    const updatedCart = [...this.cart, newItem];
    this.cartUpdate.emit(updatedCart);
  }

  /* ================= SELECTION ================= */

  toggleItemSelection(itemId: number): void {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
    this.cdr.markForCheck();
  }

  isItemSelected(itemId: number): boolean {
    return this.selectedItems.has(itemId);
  }

  selectAllItems(): void {
    this.cart.forEach(item => this.selectedItems.add(item.id));
    this.cdr.markForCheck();
  }

  clearSelection(): void {
    this.selectedItems.clear();
    this.cdr.markForCheck();
  }

  /* ================= NOTES ================= */

  toggleNotes(itemId: number): void {
    const current = this.showNotes.get(itemId) || false;
    this.showNotes.set(itemId, !current);
    this.cdr.markForCheck();
  }

  updateItemNotes(itemId: number, notes: string): void {
    const updatedCart = this.cart.map(i =>
      i.id === itemId ? { ...i, notes } : i
    );
    this.cartUpdate.emit(updatedCart);
  }

  /* ================= PRICING ================= */

  getItemTotal(item: CartItem): number {
    let total = item.price * item.qty;
    if (item.addons?.length) {
      const addonTotal = item.addons.reduce((sum, addon) => sum + addon.price, 0);
      total += addonTotal * item.qty;
    }
    return total;
  }

  getItemSubtotal(item: CartItem): number {
    return item.price * item.qty;
  }

  getAddonsTotal(item: CartItem): number {
    if (!item.addons?.length) return 0;
    return item.addons.reduce((sum, addon) => sum + addon.price, 0) * item.qty;
  }

  /* ================= CHECKOUT / PAY NOW ================= */

  proceedToCheckout(): void {
    if (!this.canCheckout) return;
    this.checkout.emit();
  }

  openPayment(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }
    if (this.requiresCustomerInfo) {
      this.showCustomerInfo = true;
      this.cdr.markForCheck();
      return;
    }
    this.showPayment = true;
    this.cdr.markForCheck();
  }

  onCustomerInfoSubmit(formData: CustomerInfo): void {
    this.customerInfo     = formData;
    this.showCustomerInfo = false;
    this.showPayment      = true;
    this.cdr.markForCheck();
  }

  onPaymentComplete(paymentData: any): void {
    console.log('Payment completed:', paymentData);
    this.finalizeBill();
    this.showPayment = false;
  }

  onPaymentCancel(): void {
    this.showPayment = false;
    this.cdr.markForCheck();
  }

  finalizeBill(): void {
    try {
      if (this.tableNumber) {
        this.holdService.clearTableHold(this.tableNumber);
        this.tableService.clearTable(this.tableNumber);
      }
      this.resetCart();
      this.showNotification('Payment successful! Order completed', 'success');
    } catch (err) {
      console.error('Finalize error:', err);
      this.showNotification('Error finalizing order', 'error');
    }
  }

  /* ================= CLOSE TABLE ================= */

  closeTable(): void {
    if (!this.tableNumber) return;

    if (this.hasItems) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title:        'Close Table?',
          message:      'Close table with items in cart? Items will be lost.',
          confirmText:  'Yes, Close',
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
    if (this.tableNumber) {
      this.holdService.clearTableHold(this.tableNumber);
      this.tableService.clearTable(this.tableNumber);
      this.resetCart();
      this.showNotification('Table closed', 'info');
    }
  }

  /* ================= CART ACTION BUTTONS ================= */

  printKOT(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }
    console.log('Printing KOT...');
    console.log('Order Number:', this.orderNumber);
    console.log('Table:', this.tableNumber);
    console.log('Items:', this.cart);
    this.showNotification('KOT sent to kitchen', 'success');
    // TODO: wire up actual KOT print service
  }

  saveOrder(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }
    this.saveState();
    this.showNotification('Order saved', 'success');
  }

  holdOrder(): void {
    if (!this.hasItems) {
      this.showNotification('Cart is empty', 'error');
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title:        'Hold Order?',
        message:      'This will hold the current order and clear the cart.',
        confirmText:  'Yes, Hold',
        confirmColor: 'warn'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        try {
          if (this.tableNumber) {
            this.holdService.holdForTable(this.tableNumber, this.cart);
            this.showNotification(`Order held for Table ${this.tableNumber}`, 'success');
          } else {
            this.holdService.holdGlobal(this.cart);
            this.showNotification('Order held', 'success');
          }
          this.resetCart();
        } catch (err) {
          console.error('Hold error:', err);
          this.showNotification('Failed to hold order', 'error');
        }
      }
    });
  }

  viewHeldOrders(): void {
    this.showHoldOrders = true;
    this.cdr.markForCheck();
  }

  recallOrder(data: CartItem[] | any): void {
    let cart: CartItem[];

    if (Array.isArray(data)) {
      cart = data;
    } else if (data && data.items) {
      cart = data.items;
      if (data.tableNumber)  this.tableNumber  = data.tableNumber;
      if (data.orderType)    this.orderType    = data.orderType;
      if (data.customerInfo) this.customerInfo = data.customerInfo;
      if (data.orderNumber)  this.orderNumber  = data.orderNumber;
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

  private syncTableOrder(): void {
    if (this.tableNumber && this.orderType === 'Dine-In') {
      this.tableService.setOrderForTable(this.tableNumber, this.cart);
    }
  }

  /* ================= NOTIFICATIONS ================= */

  showNotification(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning'
  ): void {
    const id = ++this.notificationCount;
    this.notifications.push({ id, message, type });
    setTimeout(() => this.dismissNotification(id), 5000);
    this.cdr.markForCheck();
  }

  dismissNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.cdr.markForCheck();
  }

  /* ================= STATE MANAGEMENT ================= */

  private loadSavedState(): void {
    const savedState = localStorage.getItem('cashier_state');
    if (!savedState) return;
    try {
      const state = JSON.parse(savedState);
      // cart, tableNumber, orderType arrive via @Input from cashier parent
      // only restore cart-panel-owned state here
      if (state.customerInfo) this.customerInfo = state.customerInfo;
      if (state.orderNumber)  this.orderNumber  = state.orderNumber;
      if (state.sessionId)    this.sessionId    = state.sessionId;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Failed to load saved state:', err);
    }
  }

  private saveState(): void {
    const state = {
      cart:         this.cart,
      tableNumber:  this.tableNumber,
      orderType:    this.orderType,
      customerInfo: this.customerInfo,
      orderNumber:  this.orderNumber,
      sessionId:    this.sessionId
    };
    localStorage.setItem('cashier_state', JSON.stringify(state));
  }

  private resetCart(): void {
    this.cartService.clearCart();
    this.customerInfo = null;
    this.tableNumber  = null;
    this.orderNumber  = this.generateOrderNumber();
    this.sessionId    = `SES-${Date.now()}`;
    localStorage.removeItem('cashier_state');
    this.cdr.markForCheck();
  }

  private generateOrderNumber(): string {
    return `ORD-${new Date().getTime().toString().slice(-6)}`;
  }

  /* ================= HELPERS ================= */

  refreshData(): void {
    this.loadSavedState();
    this.showNotification('Data refreshed', 'info');
  }

  getPortionLabel(portion?: 'Half' | 'Full'): string {
    if (!portion) return '';
    return portion === 'Half' ? '(Half)' : '(Full)';
  }

  trackByItemId(index: number, item: CartItem): number {
    return item.id;
  }

  /* ================= FORMATTING ================= */

  formatCurrency(amount: number): string {
    return `₹${amount.toFixed(0)}`;
  }

  getCartSummary(): string {
    return `${this.totalItems} items • ${this.formatCurrency(this.total)}`;
  }
}
