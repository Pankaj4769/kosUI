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

/* ── Models ── */
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

export interface HeaderChip {
  icon:  string;
  label: string;
  value: string | number;
}

export type CenterType = 'search' | 'chips' | 'cashier' | 'search+filter' | 'none';

export interface HeaderCenterConfig {
  type:         CenterType;
  chips?:       HeaderChip[];
  filterChips?: HeaderChip[];
}

interface RouteConfig {
  title:        string;
  icon:         string;
  centerConfig: HeaderCenterConfig;
}

/* ── Route map ── */
const ROUTE_TITLES: Record<string, RouteConfig> = {

  '/dashboard': {
    title: 'Dashboard', icon: 'explore',
    centerConfig: {
      type: 'chips',
      chips: [
        { icon: 'warning_amber', label: 'Low Stock',   value: 4       },
        { icon: 'sync',          label: 'Last Synced', value: 'Today' },
        { icon: 'inventory_2',   label: 'Total Items', value: 240     }
      ]
    }
  },

  '/inventory/dashboard': {
    title: 'Inventory Dashboard', icon: 'inventory_2',
    centerConfig: {
      type: 'chips',
      chips: [
        { icon: 'warning_amber', label: 'Low Stock',   value: 4       },
        { icon: 'sync',          label: 'Last Synced', value: 'Today' },
        { icon: 'inventory_2',   label: 'Total Items', value: 240     }
      ]
    }
  },

  '/inventory': {
    title: 'Manage Inventory', icon: 'factory',
    centerConfig: {
      type: 'chips',
      chips: [
        { icon: 'calendar_today', label: 'Date',  value: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) },
        { icon: 'alarm',          label: 'Shift', value: 'Morning' }
      ]
    }
  },

  '/pos/tables': {
    title: 'Tables', icon: 'chair',
    centerConfig: {
      type: 'chips',
      chips: [
        { icon: 'circle',                 label: 'Available', value: 8 },
        { icon: 'lens',                   label: 'Occupied',  value: 5 },
        { icon: 'radio_button_unchecked', label: 'Reserved',  value: 2 }
      ]
    }
  },

  '/pos/cashier': {
    title: 'Cashier', icon: 'point_of_sale',
    centerConfig: { type: 'cashier' }
  },

  '/pos': {
    title: 'Cashier', icon: 'point_of_sale',
    centerConfig: { type: 'cashier' }
  },

  '/pos/menu': {
    title: 'Menu', icon: 'restaurant_menu',
    centerConfig: { type: 'search' }
  },

  '/menu': {
    title: 'Menu Management', icon: 'menu_book',
    centerConfig: { type: 'search' }
  },

  '/order/live-orders': {
    title: 'Live Orders', icon: 'receipt_long',
    centerConfig: {
      type: 'chips',
      chips: [
        { icon: 'hourglass_empty',       label: 'Pending',    value: 6 },
        { icon: 'local_fire_department', label: 'In Kitchen', value: 3 },
        { icon: 'check_box',             label: 'Ready',      value: 2 }
      ]
    }
  },

  '/order/history': {
    title: 'Order History', icon: 'history',
    centerConfig: {
      type: 'search+filter',
      filterChips: [
        { icon: 'calendar_today', label: 'Filter', value: 'Today' }
      ]
    }
  },

  '/staff': {
    title: 'Staff Directory', icon: 'groups',
    centerConfig: {
      type: 'chips',
      chips: [
        { icon: 'circle',  label: 'On Duty', value: 12 },
        { icon: 'lens',    label: 'Absent',  value: 2  },
        { icon: 'article', label: 'Total',   value: 18 }
      ]
    }
  },

  '/kitchen': {
    title: 'Kitchen Display', icon: 'soup_kitchen',
    centerConfig: { type: 'none' }
  },

  '/reports': {
    title: 'Reports', icon: 'bar_chart',
    centerConfig: { type: 'search' }
  },

  '/settings': {
    title: 'Settings', icon: 'settings',
    centerConfig: { type: 'none' }
  }
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

  @Input() cashierContext: CashierContext | null = null;

  /* ── Page context ── */
  pageTitle    = 'Kitchen ERP';
  pageIcon     = 'restaurant';
  centerConfig: HeaderCenterConfig = { type: 'search' };

  /* ── Convenience getters for template ── */
  get isCashierPage():   boolean { return this.centerConfig.type === 'cashier';                                              }
  get showSearch():      boolean { return this.centerConfig.type === 'search' || this.centerConfig.type === 'search+filter'; }
  get showChips():       boolean { return this.centerConfig.type === 'chips';                                                }
  get showFilterChips(): boolean { return this.centerConfig.type === 'search+filter';                                        }
  get showSpacer():      boolean { return this.centerConfig.type === 'none';                                                  }

  /* ── User ── */
  userName    = 'Admin';
  userRole    = 'ADMIN';
  userInitial = 'A';
  userAvatar  = '';

  /* ── Role helpers ── */
  get isAdmin():   boolean { return ['ADMIN', 'SUPER_ADMIN'].includes(this.userRole);                    }
  get isManager(): boolean { return ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(this.userRole);         }

  /* ── Restaurant switcher ── */
  restaurants: Restaurant[] = [
    { id: '1', name: 'The Grand Kitchen', branch: 'MG Road'     },
    { id: '2', name: 'The Grand Kitchen', branch: 'Indiranagar' }
  ];
  activeRestaurant: Restaurant | null = this.restaurants[0];
  showRestaurantMenu = false;

  /* ── Notifications ── */
  notifications: Notification[] = [
    { id: 1, message: 'Order #1042 is ready',        time: '2 min ago',  read: false },
    { id: 2, message: 'Low stock: Paneer',            time: '8 min ago',  read: false },
    { id: 3, message: 'New table reservation: T-7',  time: '15 min ago', read: true  }
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
    public  layout:      LayoutService,
    private authService: AuthService,
    private router:      Router,
    private cdr:         ChangeDetectorRef,
    private cashierCtx:  CashierContextService
  ) {}

  /* ═══════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════ */
  ngOnInit(): void {

    // ✅ Restore dark mode from localStorage on every page load
    const saved = localStorage.getItem('darkMode');
    this.isDarkMode = saved === 'true';
    this._applyDarkMode(this.isDarkMode);

    // Cashier context stream
    this.cashierCtx.context$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ctx: CashierContext | null) => {
        this.cashierContext = ctx;
        this.cdr.markForCheck();
      });

    // Initial route title
    this.setTitleFromUrl(this.router.url);

    // Route change title updates
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
    const path = url.split('?')[0].split('#')[0];

    const matched =
      ROUTE_TITLES[path] ??
      Object.entries(ROUTE_TITLES)
        .filter(([key]) => path.startsWith(key))
        .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

    this.pageTitle    = matched?.title        ?? 'Kitchen ERP';
    this.pageIcon     = matched?.icon         ?? 'restaurant';
    this.centerConfig = matched?.centerConfig ?? { type: 'search' };
  }

  /* ── Order type icon helper ── */
  getOrderTypeIcon(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t.includes('dine'))     return 'restaurant';
    if (t.includes('takeaway')) return 'takeout_dining';
    if (t.includes('delivery')) return 'delivery_dining';
    return 'receipt_long';
  }

  /* ── Chip color class helper ── */
  getChipClass(index: number): string {
    const classes = ['chip-blue', 'chip-green', 'chip-amber', 'chip-red', 'chip-purple'];
    return classes[index % classes.length];
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

  /* ✅ Fixed: persists to localStorage + applies to <html> element */
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this._applyDarkMode(this.isDarkMode);
    localStorage.setItem('darkMode', String(this.isDarkMode));
    this.cdr.markForCheck();
  }

  toggleSidebar(): void {
    this.layout.toggle();
  }

  navigateTo(path: string): void {
    this.showUserMenu = false;
    this.router.navigate([path]);
  }

  logout(): void {
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

  /* ═══════════════════════════════════════════
     PRIVATE HELPERS
  ═══════════════════════════════════════════ */

  // ✅ Single method that applies dark/light to <html> — used by both
  //    ngOnInit (restore) and toggleDarkMode (user click)
  private _applyDarkMode(enable: boolean): void {
    if (enable) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
}
