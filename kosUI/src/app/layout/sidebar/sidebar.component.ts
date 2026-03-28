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
  label:       string;
  icon:        string;
  route?:      string;
  children?:   SidebarMenu[];
  expanded?:   boolean;
  featureKey?: FeatureKey;   // plan + role gate
  adminOnly?:  boolean;      // visible to ADMIN role only
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
      featureKey: 'staff-directory',
      expanded: false,
      children: [
        { label: 'Staff Directory',  icon: 'people_outline',         route: '/staff/directory',  featureKey: 'staff-directory'    },
        { label: 'Attendance',       icon: 'access_time',            route: '/staff/attendance', featureKey: 'attendance-tracking'},
        { label: 'Leave Management', icon: 'calendar_today',         route: '/staff/leave',      featureKey: 'leave-management'   },
        { label: 'Salary Management',icon: 'account_balance_wallet', route: '/staff/salary',     featureKey: 'payroll'            },
        { label: 'Shift Management', icon: 'schedule',               route: '/staff/shifts',     featureKey: 'shift-scheduling'   },
        { label: 'Role Management',  icon: 'admin_panel_settings',   route: '/staff/roles',      featureKey: 'role-based-access'  },
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
  ngOnInit(): void {
    this.layout.init();
    this.menuItems = this.buildFilteredMenu();
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
    return this.rawMenu
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
