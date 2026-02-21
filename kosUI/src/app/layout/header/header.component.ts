import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { CashierContext, CashierContextService } from '../../domains/pos/services/cashier-context.service';


import { LayoutService } from '../../core/services/layout.service';
import { AuthService } from '../../core/auth/auth.service';

export interface Restaurant {
  id:     string;
  name:   string;
  branch: string;
  logo?:  string;
}

export interface Notification {
  id:      number;
  message: string;
  time:    string;
  read:    boolean;
}

const ROUTE_TITLES: Record<string, { title: string; icon: string; hideSearch?: boolean; isCashier?: boolean }> = {
  '/dashboard':         { title: 'Dashboard',      icon: 'dashboard',     hideSearch: false, isCashier: false },
  '/pos/cashier':       { title: 'Cashier',         icon: 'point_of_sale', hideSearch: true,  isCashier: true  },
  '/pos':               { title: 'Cashier',         icon: 'point_of_sale', hideSearch: true,  isCashier: true  },
  '/order/live-orders': { title: 'Live Orders',     icon: 'receipt_long',  hideSearch: false, isCashier: false },
  '/kitchen':           { title: 'Kitchen Display', icon: 'soup_kitchen',  hideSearch: false, isCashier: false },
  '/menu':              { title: 'Menu Management', icon: 'menu_book',     hideSearch: false, isCashier: false },
  '/inventory':         { title: 'Inventory',       icon: 'inventory_2',   hideSearch: false, isCashier: false },
  '/reports':           { title: 'Reports',         icon: 'bar_chart',     hideSearch: false, isCashier: false },
  '/settings':          { title: 'Settings',        icon: 'settings',      hideSearch: false, isCashier: false },
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, OnDestroy {

  /* ── Cashier context — fed from POS component ── */
  @Input() cashierContext: CashierContext | null = null; 

  /* ── Page context ── */
  pageTitle   = 'Kitchen ERP';
  pageIcon    = 'restaurant';
  hideSearch  = false;
  isCashierPage = false;

  /* ── User ── */
  userName    = 'Admin';
  userRole    = 'ADMIN';
  userInitial = 'A';
  userAvatar  = '';

  /* ── Role helpers ── */
  get isAdmin():   boolean { return ['ADMIN', 'SUPER_ADMIN'].includes(this.userRole); }
  get isManager(): boolean { return ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(this.userRole); }

  /* ── Restaurant switcher ── */
  restaurants: Restaurant[] = [
    { id: '1', name: 'The Grand Kitchen', branch: 'MG Road'     },
    { id: '2', name: 'The Grand Kitchen', branch: 'Indiranagar' }
  ];
  activeRestaurant: Restaurant | null = this.restaurants[0];
  showRestaurantMenu = false;

  /* ── Notifications ── */
  notifications: Notification[] = [
    { id: 1, message: 'Order #1042 is ready',       time: '2 min ago',  read: false },
    { id: 2, message: 'Low stock: Paneer',           time: '8 min ago',  read: false },
    { id: 3, message: 'New table reservation: T-7', time: '15 min ago', read: true  }
  ];
  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
  showNotifications = false;

  /* ── Search ── */
  searchQuery   = '';
  searchFocused = false;

  /* ── UI state ── */
  showUserMenu = false;
  isDarkMode   = false;

  private destroy$ = new Subject<void>();

  constructor(
    public layout: LayoutService,
    private authService: AuthService,
    private router: Router,
    public  layout: LayoutService,
    private router: Router,
    private cdr:    ChangeDetectorRef,
    private cashierCtx: CashierContextService
  ) {}

  /* ═══════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════ */
  ngOnInit(): void {
      // ✅ ADD — subscribe to cashier context from service
  this.cashierCtx.context$
    .pipe(takeUntil(this.destroy$))
    .subscribe((ctx: CashierContext | null) => {
      this.cashierContext = ctx;
      this.cdr.markForCheck();
    });
    this.setTitleFromUrl(this.router.url);

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e: any) => {
        this.setTitleFromUrl(e.urlAfterRedirects);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ═══════════════════════════════════════════
     ROUTE TITLE
  ═══════════════════════════════════════════ */
  private setTitleFromUrl(url: string): void {
    const path    = url.split('?')[0].split('#')[0];
    const matched =
      ROUTE_TITLES[path] ??
      Object.entries(ROUTE_TITLES).find(([key]) => path.startsWith(key))?.[1];

    this.pageTitle    = matched?.title      ?? 'Kitchen ERP';
    this.pageIcon     = matched?.icon       ?? 'restaurant';
    this.hideSearch   = matched?.hideSearch ?? false;
    this.isCashierPage = matched?.isCashier ?? false;
  }

  /* ── Order type icon helper ── */
  getOrderTypeIcon(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('dine'))     return 'restaurant';
    if (t.includes('takeaway')) return 'takeout_dining';
    if (t.includes('delivery')) return 'delivery_dining';
    return 'receipt_long';
  }

  /* ═══════════════════════════════════════════
     RESTAURANT SWITCHER
  ═══════════════════════════════════════════ */
  switchRestaurant(r: Restaurant): void {
    this.activeRestaurant   = r;
    this.showRestaurantMenu = false;
    this.cdr.markForCheck();
  }

  toggleRestaurantMenu(): void {
    this.showRestaurantMenu = !this.showRestaurantMenu;
    if (this.showRestaurantMenu) {
      this.showUserMenu      = false;
      this.showNotifications = false;
    }
  }

  /* ═══════════════════════════════════════════
     NOTIFICATIONS
  ═══════════════════════════════════════════ */
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showUserMenu       = false;
      this.showRestaurantMenu = false;
    }
  }

  markAllRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.cdr.markForCheck();
  }

  dismissNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.cdr.markForCheck();
  }

  /* ═══════════════════════════════════════════
     SEARCH
  ═══════════════════════════════════════════ */
  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  /* ═══════════════════════════════════════════
     USER MENU
  ═══════════════════════════════════════════ */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showNotifications  = false;
      this.showRestaurantMenu = false;
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark', this.isDarkMode);
  }

  toggleSidebar(): void {
    this.layout.toggle();
  }

  navigateTo(path: string): void {
    this.showUserMenu = false;
    this.router.navigate([path]);
  }

  logout() {
    this.authService.logout();

  }

  /* ═══════════════════════════════════════════
     OUTSIDE CLICK / ESCAPE
  ═══════════════════════════════════════════ */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-section'))        this.showUserMenu       = false;
    if (!target.closest('.notif-section'))       this.showNotifications  = false;
    if (!target.closest('.restaurant-switcher')) this.showRestaurantMenu = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showUserMenu       = false;
    this.showNotifications  = false;
    this.showRestaurantMenu = false;
    this.cdr.markForCheck();
  }
}
