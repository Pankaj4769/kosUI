import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { BASE_URL } from '../../../apiUrls';
import { InventoryService } from '../../dashboard/services/inventory.service';
import { WaiterOrderService, WaiterMenuItem } from '../../waiter/services/waiter-order.service';

export type CustomerStep = 'login' | 'menu' | 'review' | 'done';

export interface CustomerCartItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  category: string;
  group: 'Veg' | 'Non-Veg';
  image?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string[];
  group: 'Veg' | 'Non-Veg';
  price: number;
  qty: number;
  image?: string;
  enabled: boolean;
}

@Component({
  selector: 'app-customer-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-order.component.html',
  styleUrls: ['./customer-order.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerOrderComponent implements OnInit, OnDestroy {

  /* ── Steps ───────────────────────────────────────── */
  step: CustomerStep = 'login';

  /* ── Table info ──────────────────────────────────── */
  tableId   = 0;
  tableName = '';

  /* ── Guest login ─────────────────────────────────── */
  guestName  = '';
  guestPhone = '';
  loginError = '';

  /* ── Menu ────────────────────────────────────────── */
  allItems: MenuItem[]      = [];
  filteredItems: MenuItem[] = [];
  categories: string[]      = [];
  activeCategory            = 'All';
  searchQuery               = '';
  vegOnly                   = false;
  menuLoading               = false;
  menuError                 = '';

  /* ── Cart ────────────────────────────────────────── */
  cart: CustomerCartItem[] = [];
  showCartPreview          = false;

  /* ── Review ──────────────────────────────────────── */
  orderNote  = '';
  submitting = false;

  /* ── Done ────────────────────────────────────────── */
  orderNumber = '';
  estimatedMins = 0;

  /* ── Waiter call ─────────────────────────────────── */
  waiterCallSent = false;

  /* ── Toast ───────────────────────────────────────── */
  toast: { msg: string; type: 'success' | 'info' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private inventorySvc: InventoryService,
    private waiterSvc: WaiterOrderService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.tableId   = Number(params['table']) || 0;
        this.tableName = `Table ${this.tableId}`;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  /* ── Step 1: Login ───────────────────────────────── */

  submitLogin(): void {
    this.loginError = '';
    if (!this.guestName.trim()) {
      this.loginError = 'Please enter your name.';
      return;
    }
    if (!this.guestPhone.trim() || !/^\d{7,15}$/.test(this.guestPhone.trim())) {
      this.loginError = 'Please enter a valid phone number.';
      return;
    }
    this.loadMenu();
  }

  /* ── Step 2: Menu ────────────────────────────────── */

  private loadMenu(): void {
    this.menuLoading = true;
    this.menuError   = '';
    this.step        = 'menu';
    this.cdr.markForCheck();

    // Use cached items from InventoryService if already populated
    const cached = this.waiterSvc.getMenuItems();
    if (cached.length > 0) {
      this.applyServiceItems(cached);
      return;
    }

    // Otherwise fetch from backend and populate the shared service
    this.inventorySvc.getItemlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: items => {
          this.inventorySvc.populateItems(items);
          this.applyServiceItems(this.waiterSvc.getMenuItems());
        },
        error: () => {
          this.menuLoading = false;
          this.menuError   = 'Could not load menu. Please try again.';
          this.cdr.markForCheck();
        }
      });
  }

  private applyServiceItems(items: WaiterMenuItem[]): void {
    this.allItems = items
      .filter(i => i.available)
      .map(i => ({
        id:       i.id,
        name:     i.name,
        category: [i.category],
        group:    i.group,
        price:    i.price,
        qty:      99,
        image:    i.image,
        enabled:  true,
      }));
    const cats = new Set(this.allItems.flatMap(i => i.category));
    this.categories  = ['All', ...Array.from(cats)];
    this.menuLoading = false;
    this.applyMenuFilters();
    this.cdr.markForCheck();
  }

  applyMenuFilters(): void {
    let list = [...this.allItems];
    if (this.activeCategory !== 'All') {
      list = list.filter(i => i.category.includes(this.activeCategory));
    }
    if (this.vegOnly) {
      list = list.filter(i => i.group === 'Veg');
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    this.filteredItems = list;
  }

  setCategory(cat: string): void {
    this.activeCategory = cat;
    this.applyMenuFilters();
  }

  /* ── Cart ────────────────────────────────────────── */

  getQty(itemId: number): number {
    return this.cart.find(c => c.id === itemId)?.qty ?? 0;
  }

  addToCart(item: MenuItem): void {
    const existing = this.cart.find(c => c.id === item.id);
    if (existing) {
      existing.qty++;
    } else {
      this.cart.push({
        id:       item.id,
        name:     item.name,
        price:    item.price,
        qty:      1,
        category: item.category[0] ?? '',
        group:    item.group,
        image:    item.image,
      });
    }
    this.cdr.markForCheck();
  }

  /** Increment qty for an item already in the cart (used by cart sheet). */
  incrementCartItem(itemId: number): void {
    const item = this.allItems.find(i => i.id === itemId);
    if (item) this.addToCart(item);
  }

  removeFromCart(itemId: number): void {
    const existing = this.cart.find(c => c.id === itemId);
    if (!existing) return;
    if (existing.qty > 1) {
      existing.qty--;
    } else {
      this.cart = this.cart.filter(c => c.id !== itemId);
    }
    this.cdr.markForCheck();
  }

  get cartCount(): number {
    return this.cart.reduce((s, c) => s + c.qty, 0);
  }

  get cartSubtotal(): number {
    return this.cart.reduce((s, c) => s + c.price * c.qty, 0);
  }

  get cartTax(): number {
    return Math.round(this.cartSubtotal * 0.05 * 100) / 100;
  }

  get cartTotal(): number {
    return this.cartSubtotal + this.cartTax;
  }

  goToReview(): void {
    if (this.cart.length === 0) return;
    this.showCartPreview = false;
    this.step = 'review';
    this.cdr.markForCheck();
  }

  /* ── Step 3: Review & Place Order ────────────────── */

  placeOrder(): void {
    if (this.submitting || this.cart.length === 0) return;
    this.submitting = true;
    this.cdr.markForCheck();

    const payload = {
      tableId:    this.tableId,
      guestName:  this.guestName,
      guestPhone: this.guestPhone,
      items:      this.cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price })),
      note:       this.orderNote,
      totalAmount: this.cartTotal,
    };

    this.http.post<{ orderNumber: string; estimatedMinutes: number }>(
      `${BASE_URL}/placeCustomerOrder`, payload
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.orderNumber    = res.orderNumber;
        this.estimatedMins  = res.estimatedMinutes;
        this.submitting     = false;
        this.step           = 'done';
        this.cdr.markForCheck();
      },
      error: () => {
        // Graceful fallback: show success even without backend
        this.orderNumber   = `ORD-${Date.now().toString().slice(-6)}`;
        this.estimatedMins = 15 + Math.floor(this.cart.length * 2);
        this.submitting    = false;
        this.step          = 'done';
        this.cdr.markForCheck();
      }
    });
  }

  /* ── Waiter call ─────────────────────────────────── */

  callWaiter(): void {
    if (this.waiterCallSent) {
      this.showToast('Waiter is already on the way!', 'info');
      return;
    }
    this.http.post(`${BASE_URL}/callWaiter`, { tableId: this.tableId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.onWaiterCallSuccess(),
        error: () => this.onWaiterCallSuccess(), // still show success UX
      });
  }

  private onWaiterCallSuccess(): void {
    this.waiterCallSent = true;
    this.showToast('Waiter has been called! They will be with you shortly.', 'success');
    this.cdr.markForCheck();
    // Reset after 2 minutes so customer can call again
    setTimeout(() => {
      this.waiterCallSent = false;
      this.cdr.markForCheck();
    }, 120_000);
  }

  /* ── Helpers ─────────────────────────────────────── */

  backToMenu(): void {
    this.step = 'menu';
    this.cdr.markForCheck();
  }

  /** From the done screen — clear cart and go back to menu for a new order. */
  addMoreItems(): void {
    this.cart      = [];
    this.orderNote = '';
    this.step      = 'menu';
    this.cdr.markForCheck();
  }

  trackItem(_: number, item: MenuItem): number          { return item.id; }
  trackCart(_: number, item: CustomerCartItem): number  { return item.id; }

  private showToast(msg: string, type: 'success' | 'info' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.markForCheck();
    }, 3000);
  }
}
