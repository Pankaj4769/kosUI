import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from '../models/cart-item.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  /* ================= STATE ================= */

  private STORAGE_KEY = 'temp_cart';

  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  private nextId = 1;

  constructor() {
    this.loadCartFromStorage();

    // Automatically persist changes
    this.cart$.subscribe(cart => {
      this.saveCartToStorage(cart);
    });
  }

  /* ================= LOCAL STORAGE ================= */

  private loadCartFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);

    if (stored) {
      try {
        const parsed: CartItem[] = JSON.parse(stored);
        this.cartSubject.next(parsed);

        // Restore nextId correctly
        const maxId = parsed.reduce((max, item) => 
          item.id && item.id > max ? item.id : max, 0);
        this.nextId = maxId + 1;

      } catch (err) {
        console.error('Failed to load cart from storage', err);
        this.cartSubject.next([]);
      }
    }
  }

  private saveCartToStorage(cart: CartItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
  }

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

  addItem(item: CartItem): void {
    const cart = [...this.currentCart];

    if (!item.id) {
      item.id = this.nextId++;
    }

    const existingIndex = cart.findIndex(i =>
      i.name === item.name &&
      i.portion === item.portion &&
      this.areAddonsEqual(i.addons, item.addons)
    );

    if (existingIndex > -1) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        qty: cart[existingIndex].qty + (item.qty || 1)
      };
    } else {
      cart.push({ ...item, qty: item.qty || 1 });
    }

    this.cartSubject.next(cart);
  }

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

  removeItem(itemId: number): void {
    const cart = this.currentCart.filter(item => item.id !== itemId);
    this.cartSubject.next(cart);
  }

  setCart(items: CartItem[]): void {
    const cartWithIds = items.map(item => ({
      ...item,
      id: item.id || this.nextId++
    }));

    this.cartSubject.next(cartWithIds);
  }

  clearCart(): void {
    this.cartSubject.next([]);
  }

  updateItem(itemId: number, updates: Partial<CartItem>): void {
    const cart = this.currentCart.map(item =>
      item.id === itemId
        ? { ...item, ...updates }
        : item
    );

    this.cartSubject.next(cart);
  }

  getItemById(itemId: number): CartItem | undefined {
    return this.currentCart.find(item => item.id === itemId);
  }

  hasItem(itemName: string): boolean {
    return this.currentCart.some(item => item.name === itemName);
  }

  getItemQuantity(itemName: string): number {
    return this.currentCart
      .filter(item => item.name === itemName)
      .reduce((sum, item) => sum + item.qty, 0);
  }

  /* ================= HELPERS ================= */

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

  /* ================= BULK ================= */

  incrementItem(itemId: number): void {
    const item = this.getItemById(itemId);
    if (item) {
      this.updateItemQuantity(itemId, item.qty + 1);
    }
  }

  decrementItem(itemId: number): void {
    const item = this.getItemById(itemId);
    if (item && item.qty > 1) {
      this.updateItemQuantity(itemId, item.qty - 1);
    } else if (item && item.qty === 1) {
      this.removeItem(itemId);
    }
  }

  duplicateItem(itemId: number): void {
    const item = this.getItemById(itemId);
    if (item) {
      const duplicated = { ...item, id: this.nextId++ };
      this.cartSubject.next([...this.currentCart, duplicated]);
    }
  }

  /* ================= EXPORT/IMPORT ================= */

  exportCart(): string {
    return JSON.stringify(this.currentCart, null, 2);
  }

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
}
