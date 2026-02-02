import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

// Models
import { CartItem } from '../../models/cart-item.model';

/* ================= TYPES ================= */

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';

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
    MatDividerModule
  ],
  templateUrl: './cart-panel.component.html',
  styleUrls: ['./cart-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPanelComponent implements OnChanges {

  /* ================= INPUTS ================= */

  @Input() cart: CartItem[] = [];
  @Input() subtotal: number = 0;
  @Input() tax: number = 0;
  @Input() discount: number = 0;
  @Input() total: number = 0;
  @Input() orderType: OrderType = 'Dine-In';
  @Input() tableNumber: number | null = null;

  /* ================= OUTPUTS ================= */

  @Output() cartUpdate = new EventEmitter<CartItem[]>();
  @Output() itemRemove = new EventEmitter<number>();
  @Output() checkout = new EventEmitter<void>();

  /* ================= STATE ================= */

  editingItemId: number | null = null;
  editingQuantity: number = 0;
  selectedItems = new Set<number>();
  showNotes = new Map<number, boolean>();

  /* ================= CONSTRUCTOR ================= */

  constructor(private cdr: ChangeDetectorRef) {}

  /* ================= LIFECYCLE ================= */

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cart']) {
      // Clean up editing state if item removed
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
    this.editingItemId = item.id;
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
    this.editingItemId = null;
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
    
    if (!confirm(`Remove ${this.selectedItems.size} selected items?`)) return;

    this.selectedItems.forEach(id => this.itemRemove.emit(id));
    this.selectedItems.clear();
    this.cdr.markForCheck();
  }

  duplicateItem(item: CartItem): void {
    const newItem = { ...item, id: Date.now() }; // Temporary ID
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
    
    // Add addon prices
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

  /* ================= CHECKOUT ================= */

  proceedToCheckout(): void {
    if (!this.canCheckout) return;
    this.checkout.emit();
  }

  /* ================= HELPERS ================= */

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
