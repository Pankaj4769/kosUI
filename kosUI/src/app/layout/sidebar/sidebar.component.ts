import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { LayoutService } from '../../core/services/layout.service';
import { AccessService } from '../../core/services/access.service';
import { RoleService } from '../../core/services/role.service';
import { FeatureKey } from '../../core/config/feature-access.config';

export interface SidebarMenu {
  label:        string;
  icon:         string;
  route?:       string;
  externalUrl?: string;      // opens in a new browser tab
  children?:    SidebarMenu[];
  expanded?:    boolean;
  featureKey?:  FeatureKey;  // plan + role gate
  adminOnly?:   boolean;     // visible to ADMIN role only
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {

  isHovered = false;

  private destroy$ = new Subject<void>();

  private readonly rawMenu: SidebarMenu[] = [
    {
      label: 'Admin Dashboard', icon: 'admin_panel_settings',
      adminOnly: true,
      expanded: false,
      children: [
        { label: 'Admin Dashboard',              icon: 'dashboard',       route: '/admin',                  adminOnly: true },
        { label: 'User & Tenant Management',     icon: 'manage_accounts', route: '/admin/users',            adminOnly: true },
        { label: 'Subscription Revenue',         icon: 'payments',        route: '/admin/subscriptions',    adminOnly: true },
        { label: 'RBAC Engine',                  icon: 'security',        route: '/admin/rbac',             adminOnly: true },
        { label: 'Product & Feature Management', icon: 'inventory',       route: '/admin/products',         adminOnly: true },
        { label: 'Notifications',                icon: 'notifications',   route: '/admin/notifications',    adminOnly: true },
        { label: 'Security Compliance',          icon: 'verified_user',   route: '/admin/security',         adminOnly: true },
        { label: 'Configuration & Management',   icon: 'tune',            route: '/admin/configuration',    adminOnly: true },
        { label: 'AI Smart Control',             icon: 'psychology',      route: '/admin/ai-control',       adminOnly: true },
      ]
    },
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    {
      label: 'Inventory', icon: 'inventory_2',
      featureKey: 'inventory-dashboard',
      expanded: false,
      children: [
        { label: 'Inventory Dashboard', icon: 'analytics',  route: '/inventory/dashboard', featureKey: 'inventory-dashboard'       },
        { label: 'Manage Inventory',    icon: 'warehouse',   route: '/inventory/manage',    featureKey: 'stock-items'               },
        { label: 'Stock Alerts',        icon: 'warning',     route: '/inventory/alerts',    featureKey: 'low-stock-alerts'          },
        { label: 'Supplier Management', icon: 'local_shipping', route: '/inventory/suppliers', featureKey: 'supplier-management'   },
        { label: 'Purchase Orders',     icon: 'shopping_bag',  route: '/inventory/purchase',  featureKey: 'purchase-order-management'},
        { label: 'Waste Tracking',      icon: 'delete_sweep',  route: '/inventory/waste',     featureKey: 'waste-tracking'          },
      ]
    },
    {
      label: 'POS', icon: 'point_of_sale',
      featureKey: 'cashier-panel',
      expanded: false,
      children: [
        { label: 'Cashier',  icon: 'payments',        route: '/pos',        featureKey: 'cashier-panel'       },
        { label: 'Menu',     icon: 'restaurant_menu', route: '/pos/menu',   featureKey: 'menu-management'     },
        { label: 'Tables',   icon: 'table_chart',     route: '/pos/tables', featureKey: 'table-management'    },
      ]
    },
    { label: 'Waiter', icon: 'room_service', route: '/waiter', featureKey: 'table-management' },
    {
      label: 'Orders', icon: 'shopping_cart',
      featureKey: 'live-order-tracking',
      expanded: false,
      children: [
        { label: 'Live Orders',   icon: 'receipt_long', route: '/orders/live',    featureKey: 'live-order-tracking' },
        { label: 'Order History', icon: 'history',      route: '/orders/history', featureKey: 'order-history'       },
      ]
    },
    {
      label: 'Employee Management', icon: 'people',
      externalUrl: 'http://173.255.113.108/empUI/',
      featureKey: 'staff-directory',
      expanded: false,
      children: [
        { label: 'EM Dashboard',     icon: 'dashboard',              route: '/staff/em-dashboard',   featureKey: 'staff-directory'    },
        { label: 'Staff Directory',  icon: 'people_outline',         route: '/staff/directory',      featureKey: 'staff-directory'    },
        { label: 'Attendance',       icon: 'access_time',            route: '/staff/attendance',     featureKey: 'attendance-tracking'},
        { label: 'Leave Management', icon: 'calendar_today',         route: '/staff/leave',          featureKey: 'leave-management'   },
        { label: 'Salary Management',icon: 'account_balance_wallet', route: '/staff/salary',         featureKey: 'payroll'            },
        { label: 'Commission',       icon: 'trending_up',            route: '/staff/commissions',    featureKey: 'payroll'            },
        { label: 'Overtime',         icon: 'more_time',              route: '/staff/overtime',       featureKey: 'attendance-tracking'},
        { label: 'Shift Management', icon: 'schedule',               route: '/staff/shifts',         featureKey: 'shift-scheduling'   },
        { label: 'Holiday Calendar', icon: 'event',                  route: '/staff/holidays',       featureKey: 'staff-directory'    },
        { label: 'Departments',      icon: 'corporate_fare',         route: '/staff/departments',    featureKey: 'staff-directory'    },
        { label: 'Role Management',    icon: 'admin_panel_settings',   route: '/staff/roles',          featureKey: 'role-based-access'  },
        { label: 'Staff Documents',   icon: 'folder_shared',          route: '/staff/documents',      featureKey: 'staff-directory'    },
        { label: 'Announcements',     icon: 'campaign',               route: '/staff/announcements',  featureKey: 'staff-directory'    },
        { label: 'Salary Advances',   icon: 'currency_rupee',         route: '/staff/advances',       featureKey: 'payroll'            },
        { label: 'Expenses',          icon: 'receipt_long',           route: '/staff/expenses',       featureKey: 'payroll'            },
        { label: 'Performance',       icon: 'star_rate',              route: '/staff/performance',    featureKey: 'staff-directory'    },
        { label: 'Onboarding',        icon: 'person_add',             route: '/staff/onboarding',     featureKey: 'staff-directory'    },
        { label: 'Grievances',        icon: 'report_problem',         route: '/staff/grievances',     featureKey: 'staff-directory'    },
        { label: 'HR Analytics',      icon: 'bar_chart',              route: '/staff/hr-analytics',   featureKey: 'staff-performance-reports' },
      ]
    },
    {
      label: 'System', icon: 'settings',
      featureKey: 'settings',
      expanded: false,
      children: [
        { label: 'Settings', icon: 'settings_applications', route: '/settings', featureKey: 'settings'  },
        { label: 'QR Codes', icon: 'qr_code',               route: '/qr',       featureKey: 'qr-codes'  },
      ]
    },
    {
      label: 'All Reports', icon: 'bar_chart',
      featureKey: 'sales-reports',
      expanded: false,
      children: [
        { label: 'Sales Report',             icon: 'analytics',       route: '/reports/sales',     featureKey: 'sales-reports'                },
        { label: 'Expense Report',           icon: 'receipt',         route: '/reports/customer',  featureKey: 'expense-reports'              },
        { label: 'Inventory Report',         icon: 'inventory_2',     route: '/reports/inventory', featureKey: 'inventory-reports'            },
        { label: 'Staff Report',             icon: 'people',          route: '/reports/staff',     featureKey: 'staff-performance-reports'    },
        { label: 'Financial Report',         icon: 'account_balance', route: '/reports/financial', featureKey: 'profit-loss-reports'          },
        { label: 'Kitchen & Order Report',   icon: 'restaurant',      route: '/reports/kitchen',   featureKey: 'live-order-tracking'          },
        { label: 'Online & Delivery Report', icon: 'local_shipping',  route: '/reports/delivery',  featureKey: 'delivery-partner-integration' },
        { label: 'Multiple Branch Report',   icon: 'apartment',       route: '/reports/branches',  featureKey: 'advanced-analytics'           },
      ]
    }
  ];

  menuItems: SidebarMenu[] = [];

  constructor(
    public  layout:  LayoutService,
    private router:  Router,
    private cdr:     ChangeDetectorRef,
    private access:  AccessService,
    private role:    RoleService
  ) {}

  /* ═══════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════ */
  get isEmMode(): boolean {
    return sessionStorage.getItem('kosEmMode') === 'true';
  }

  ngOnInit(): void {
    // Detect EM-only tab: set from URL param, persist in sessionStorage for this tab
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'em') {
      sessionStorage.setItem('kosEmMode', 'true');
    }

    this.layout.init();
    this.menuItems = this.buildFilteredMenu();

    // In EM mode, auto-expand the single group
    if (this.isEmMode && this.menuItems[0]?.children) {
      this.menuItems[0].expanded = true;
    }

    this.autoExpandActiveGroup();

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.autoExpandActiveGroup();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ═══════════════════════════════════════════
     ACCESS FILTERING
  ═══════════════════════════════════════════ */
  private canShowItem(item: SidebarMenu): boolean {
    if (item.adminOnly) return this.role.isAdmin();
    if (item.featureKey) return this.access.canAccess(item.featureKey);
    return true;
  }

  private buildFilteredMenu(): SidebarMenu[] {
    const source = this.isEmMode
      ? this.rawMenu.filter(item => item.label === 'Employee Management')
      : this.rawMenu;

    return source
      .filter(item => this.canShowItem(item))
      .map(item => {
        if (!item.children) return item;

        const visibleChildren = item.children.filter(c => this.canShowItem(c));

        // Hide the parent group if no children survive the filter
        if (visibleChildren.length === 0) return null;

        return { ...item, children: visibleChildren };
      })
      .filter((item): item is SidebarMenu => item !== null);
  }

  /* ═══════════════════════════════════════════
     ROUTE HELPERS
  ═══════════════════════════════════════════ */
  private autoExpandActiveGroup(): void {
    const url = this.router.url;
    this.menuItems.forEach(item => {
      if (item.children) {
        item.expanded = item.children.some(
          child => child.route && url.startsWith(child.route)
        );
      }
    });
  }

  /* ═══════════════════════════════════════════
     MENU ACTIONS
  ═══════════════════════════════════════════ */
  toggleGroup(item: SidebarMenu): void {
    if (item.externalUrl) {
      const token   = localStorage.getItem('token');
      const kosUser = localStorage.getItem('kos_user');

      let url = item.externalUrl.includes('?')
        ? `${item.externalUrl}&mode=em`
        : `${item.externalUrl}?mode=em`;

      if (token)   url += `&token=${encodeURIComponent(token)}`;
      if (kosUser) url += `&user=${encodeURIComponent(btoa(kosUser))}`;

      window.open(url, '_blank');
      return;
    }
    item.expanded = !item.expanded;
    this.cdr.markForCheck();
  }

  /* ═══════════════════════════════════════════
     HOVER — expand sidebar on hover when collapsed
  ═══════════════════════════════════════════ */
  onMouseEnter(): void {
    this.isHovered = true;
    this.cdr.markForCheck();
  }

  onMouseLeave(): void {
    this.isHovered = false;
    this.cdr.markForCheck();
  }

  /* ═══════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════ */
  // Show tooltip only when truly collapsed (not hovered)
  getTooltip(label: string): string {
    return (this.layout.isSidebarCollapsed && !this.isHovered) ? label : '';
  }

  // True when sidebar should visually appear collapsed
  get isCollapsedView(): boolean {
    return this.layout.isSidebarCollapsed && !this.isHovered;
  }

  trackByLabel(_: number, item: SidebarMenu): string {
    return item.label;
  }
}
