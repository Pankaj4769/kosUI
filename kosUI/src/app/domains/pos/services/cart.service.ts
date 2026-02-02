import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/cart-item.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  /* ================= STATE ================= */

  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  private nextId = 1;

  /* ================= GETTERS ================= */

  get currentCart(): CartItem[] {
    return this.cartSubject.value;
  }

  get itemCount(): number {
    return this.currentCart.reduce((sum, item) => sum + item.qty, 0);
  }

  get subtotal(): number {
    return this.currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  /* ================= CORE METHODS ================= */

  /**
   * Add item to cart or increment quantity if exists
   */
  addItem(item: CartItem): void {
    const cart = [...this.currentCart];
    
    // Assign ID if not present
    if (!item.id) {
      item.id = this.nextId++;
    }

    // Check if item with same name and customization exists
    const existingIndex = cart.findIndex(i => 
      i.name === item.name && 
      i.portion === item.portion &&
      this.areAddonsEqual(i.addons, item.addons)
    );

    if (existingIndex > -1) {
      // Item exists - increment quantity
      cart[existingIndex] = {
        ...cart[existingIndex],
        qty: cart[existingIndex].qty + (item.qty || 1)
      };
    } else {
      // New item - add to cart
      cart.push({ ...item, qty: item.qty || 1 });
    }

    this.cartSubject.next(cart);
  }

  /**
   * Update item quantity
   */
  updateItemQuantity(itemId: number, newQty: number): void {
    if (newQty <= 0) {
      this.removeItem(itemId);
      return;
    }

    const cart = this.currentCart.map(item => 
      item.id === itemId 
        ? { ...item, qty: newQty }
        : item
    );

    this.cartSubject.next(cart);
  }

  /**
   * Remove item from cart
   */
  removeItem(itemId: number): void {
    const cart = this.currentCart.filter(item => item.id !== itemId);
    this.cartSubject.next(cart);
  }

  /**
   * Update entire cart
   */
  setCart(items: CartItem[]): void {
    // Ensure all items have IDs
    const cartWithIds = items.map(item => ({
      ...item,
      id: item.id || this.nextId++
    }));

    this.cartSubject.next(cartWithIds);
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this.cartSubject.next([]);
  }

  /**
   * Update specific item
   */
  updateItem(itemId: number, updates: Partial<CartItem>): void {
    const cart = this.currentCart.map(item =>
      item.id === itemId
        ? { ...item, ...updates }
        : item
    );

    this.cartSubject.next(cart);
  }

  /**
   * Get item by ID
   */
  getItemById(itemId: number): CartItem | undefined {
    return this.currentCart.find(item => item.id === itemId);
  }

  /**
   * Check if item exists in cart
   */
  hasItem(itemName: string): boolean {
    return this.currentCart.some(item => item.name === itemName);
  }

  /**
   * Get item quantity in cart
   */
  getItemQuantity(itemName: string): number {
    return this.currentCart
      .filter(item => item.name === itemName)
      .reduce((sum, item) => sum + item.qty, 0);
  }

  /* ================= HELPER METHODS ================= */

  /**
   * Compare addons arrays for equality
   */
  private areAddonsEqual(
    addons1?: { name: string; price: number }[],
    addons2?: { name: string; price: number }[]
  ): boolean {
    if (!addons1 && !addons2) return true;
    if (!addons1 || !addons2) return false;
    if (addons1.length !== addons2.length) return false;

    const sorted1 = [...addons1].sort((a, b) => a.name.localeCompare(b.name));
    const sorted2 = [...addons2].sort((a, b) => a.name.localeCompare(b.name));

    return sorted1.every((addon, index) =>
      addon.name === sorted2[index].name &&
      addon.price === sorted2[index].price
    );
  }

  /* ================= BULK OPERATIONS ================= */

  /**
   * Increment item quantity
   */
  incrementItem(itemId: number): void {
    const item = this.getItemById(itemId);
    if (item) {
      this.updateItemQuantity(itemId, item.qty + 1);
    }
  }

  /**
   * Decrement item quantity
   */
  decrementItem(itemId: number): void {
    const item = this.getItemById(itemId);
    if (item && item.qty > 1) {
      this.updateItemQuantity(itemId, item.qty - 1);
    } else if (item && item.qty === 1) {
      this.removeItem(itemId);
    }
  }

  /**
   * Duplicate item in cart
   */
  duplicateItem(itemId: number): void {
    const item = this.getItemById(itemId);
    if (item) {
      const duplicated = { ...item, id: this.nextId++ };
      this.cartSubject.next([...this.currentCart, duplicated]);
    }
  }

  /* ================= EXPORT/IMPORT ================= */

  /**
   * Export cart as JSON
   */
  exportCart(): string {
    return JSON.stringify(this.currentCart, null, 2);
  }

  /**
   * Import cart from JSON
   */
  importCart(jsonString: string): boolean {
    try {
      const items = JSON.parse(jsonString) as CartItem[];
      this.setCart(items);
      return true;
    } catch (err) {
      console.error('Failed to import cart:', err);
      return false;
    }
  }

  /* ================= ANALYTICS ================= */

  /**
   * Get cart summary statistics
   */
  getCartSummary() {
    const cart = this.currentCart;
    
    return {
      itemCount: cart.length,
      totalQuantity: this.itemCount,
      subtotal: this.subtotal,
      averageItemPrice: cart.length > 0 ? this.subtotal / this.itemCount : 0,
      mostExpensiveItem: cart.reduce((max, item) => 
        item.price > (max?.price || 0) ? item : max, cart[0]
      ),
      cheapestItem: cart.reduce((min, item) => 
        item.price < (min?.price || Infinity) ? item : min, cart[0]
      )
    };
  }
}
