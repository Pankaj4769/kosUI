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

export interface SidebarMenu {
  label:        string;
  icon:         string;
  route?:       string;
  children?:    SidebarMenu[];
  expanded?:    boolean;
  allowedRoles?: string[];
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

  menuItems: SidebarMenu[] = [
    {
      label: 'Admin Dashboard', icon: 'admin_panel_settings',
      expanded: false,
      children: [
        { label: 'Admin Dashboard',              icon: 'dashboard',             route: '/admin'                    },
        { label: 'User & Tenant Management',     icon: 'manage_accounts',       route: '/admin/users'              },
        { label: 'Subscription Revenue',         icon: 'payments',              route: '/admin/subscriptions'      },
        { label: 'RBAC Engine',                  icon: 'security',              route: '/admin/rbac'               },
        { label: 'Product & Feature Management', icon: 'inventory',             route: '/admin/products'           },
        { label: 'Notifications',                icon: 'notifications',         route: '/admin/notifications'      },
        { label: 'Security Compliance',          icon: 'verified_user',         route: '/admin/security'           },
        { label: 'Configuration & Management',   icon: 'tune',                  route: '/admin/configuration'      },
        { label: 'AI Smart Control',             icon: 'psychology',            route: '/admin/ai-control'         },
      ]
    },
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    {
      label: 'Inventory', icon: 'inventory_2',
      expanded: false,
      children: [
        { label: 'Inventory Dashboard', icon: 'analytics', route: '/inventory/dashboard' },
        { label: 'Manage Inventory',    icon: 'warehouse',  route: '/inventory/manage'   },
      ]
    },
    {
      label: 'POS', icon: 'point_of_sale',
      expanded: false,
      children: [
        { label: 'Tables',  icon: 'table_chart',    route: '/pos/tables' },
        { label: 'Cashier', icon: 'payments',       route: '/pos'        },
        { label: 'Menu',    icon: 'restaurant_menu', route: '/pos/menu'  },
      ]
    },
    {
      label: 'Orders', icon: 'shopping_cart',
      expanded: false,
      children: [
        { label: 'Live Orders',    icon: 'receipt_long', route: '/orders/live'    },
        { label: 'Order History',  icon: 'history',      route: '/orders/history' },
      ]
    },
    {
      label: 'Employee Management', icon: 'people',   // ✅ fixed label spacing
      expanded: false,
      children: [
        { label: 'Staff Directory',  icon: 'people_outline',         route: '/staff/directory'  },
        { label: 'Attendance',       icon: 'access_time',            route: '/staff/attendance' },
        { label: 'Leave Management', icon: 'calendar_today',         route: '/staff/leave'      },
        { label: 'Salary Management',icon: 'account_balance_wallet', route: '/staff/salary'     },
        { label: 'Shift Management', icon: 'schedule',               route: '/staff/shifts'     },
        { label: 'Role Management',  icon: 'admin_panel_settings',   route: '/staff/roles'      },
      ]
    },
    {
      label: 'System', icon: 'settings',
      expanded: false,
      children: [
        { label: 'QR Codes', icon: 'qr_code',               route: '/qr'       },
        { label: 'Settings', icon: 'settings_applications',  route: '/settings' },
      ]
    },
    {
      label: 'All Reports', icon: 'bar_chart',
      expanded: false,
      children: [
        { label: 'Sales Report',             icon: 'analytics',      route: '/reports/sales'      },
        { label: 'Inventory Report',         icon: 'inventory_2',    route: '/reports/inventory'  },
        { label: 'Customer Report',          icon: 'people',         route: '/reports/customer'   },
        { label: 'Staff Report',             icon: 'people',         route: '/reports/staff'      },
        { label: 'Financial Report',         icon: 'account_balance', route: '/reports/financial' },
        { label: 'Kitchen & Order Report',   icon: 'restaurant',     route: '/reports/kitchen'    },
        { label: 'Online & Delivery Report', icon: 'local_shipping', route: '/reports/delivery'   },
        { label: 'Multiple Branch Report',   icon: 'apartment',      route: '/reports/branches'   },
      ]
    }
  ];

  constructor(
    public  layout: LayoutService,
    private router: Router,
    private cdr:    ChangeDetectorRef
  ) {}

  /* ═══════════════════════════════════════════
     LIFECYCLE
  ═══════════════════════════════════════════ */
  ngOnInit(): void {
    this.layout.init();
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
