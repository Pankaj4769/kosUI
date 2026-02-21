import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LayoutService } from '../../core/services/layout.service';

interface SidebarMenu {
  label: string;
  icon: string;
  route?: string;
  children?: SidebarMenu[];
  expanded?: boolean;
  allowedRoles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  isHovered = false; // ✅ Track hover state

  constructor(
    public layout: LayoutService,
    private router: Router
  ) {}

  menuItems: SidebarMenu[] = [
    { label: 'login', icon: 'dashboard',
      expanded: false,
      children: [
        { label: 'login', icon: 'dashboard', route: '/login' },
        { label: 'onboarding/subscription', icon: 'dashboard', route: '/onboarding/subscription' },
        { label: 'onboarding/pending', icon: 'dashboard', route: '/onboarding/pending' },
        { label: 'onboarding/setup', icon: 'dashboard', route: '/onboarding/setup' },
      ]
    },
    { label: 'Admin Dashboard', icon: 'dashboard',
      expanded: false,
      children: [
        { label: 'Admin Dashboard', icon: 'dashboard',route: '/admin' },
        { label: 'User & Tenant Management', icon: 'dashboard', route: '/admin/users' },
        { label: 'Subscription Revenue', icon: 'dashboard', route: '/admin/subscriptions' },
        { label: 'RBAC Engine', icon: 'dashboard', route: '/admin/rbac' },
        { label: 'Product & Feature Management', icon: 'dashboard', route: '/admin/products' },
        { label: 'Notifications', icon: 'dashboard', route: '/admin/notifications' },
        { label: 'Security Compliance', icon: 'dashboard', route: '/admin/security' },
        { label: 'Configuration & Management', icon: 'dashboard', route: '/admin/configuration' },
        { label: 'AI Smart Control', icon: 'dashboard', route: '/admin/ai-control' },
        // { label: 'System Monitoring', icon: 'dashboard', route: '/admin/system-monitoring' },
      ]
    },
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    {
      label: 'Inventory',
      icon: 'inventory_2',
      expanded: false,
      children: [
        { label: 'Inventory Dashboard', icon: 'analytics', route: '/inventory/dashboard' },
        { label: 'Manage Inventory', icon: 'warehouse', route: '/inventory/manage' },
      ]
    },
    {
      label: 'POS',
      icon: 'point_of_sale',
      expanded: false,
      children: [
        { label: 'Tables', icon: 'table_chart', route: '/pos/tables' },
        { label: 'Cashier', icon: 'payments', route: '/pos' },
        { label: 'Menu', icon: 'restaurant_menu', route: '/pos/menu' },
      ]
    },
    {
      label: 'Orders',
      icon: 'shopping_cart',
      expanded: false,
      children: [
        { label: 'Live Orders', icon: 'receipt_long', route: '/orders/live' },
        { label: 'Order History', icon: 'history', route: '/orders/history' },
      ]
    },
     {
      label: 'EmployeeManagement',
      icon: 'people',
      expanded: false,
      children: [
        { label: 'Staff', icon: 'people', route: '/pos/staff' },
        { label: 'Staff Directory', icon: 'people_outline', route: '/staff/directory' },
        { label: 'Attendance', icon: 'access_time', route: '/staff/attendance' },
        { label: 'Leave Management', icon: 'calendar_today', route: '/staff/leave' },
        { label: 'Salary Management', icon: 'account_balance_wallet', route: '/staff/salary' },
        { label: 'Shift Management', icon: 'schedule', route: '/staff/shifts' },
        { label: 'Role Management', icon: 'admin_panel_settings', route: '/staff/roles' },
      ]
    },
    {
      label: 'System',
      icon: 'settings',
      expanded: false,
      children: [
        { label: 'QR Codes', icon: 'qr_code', route: '/qr' },
        { label: 'Settings', icon: 'settings_applications', route: '/settings' },
      ]
    },
    {
      label: 'All Reports',
      icon: 'bar_chart',
      expanded: false,
      children: [
        { label: 'Sales Report', icon: 'analytics', route: '/reports/sales' },
        { label: 'Inventory Report', icon: 'inventory_2', route: '/reports/inventory' },
        { label: 'Customer Report', icon: 'people', route: '/reports/customer' },
        { label: 'Staff Report', icon: 'people', route: '/reports/staff' },
        { label: 'Financial Report', icon: 'account_balance', route: '/reports/financial' },
        { label: 'Kitchen & Order Report', icon: 'restaurant', route: '/reports/kitchen' },
        { label: 'Online & Delivery Report', icon: 'local_shipping', route: '/reports/delivery' },
        { label: 'Multiple Branch Report', icon: 'apartment', route: '/reports/branches' },
      ]
    }
  ];

  ngOnInit() {
    this.autoExpandActiveGroup();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.autoExpandActiveGroup());
  }

  // ✅ Auto expand group based on active route
  private autoExpandActiveGroup() {
    const currentUrl = this.router.url;
    this.menuItems.forEach(item => {
      if (item.children) {
        item.expanded = item.children.some(child =>
          currentUrl.startsWith(child.route!)
        );
      }
    });
  }

  // ✅ Expand / Collapse Group (click)
  toggleGroup(item: SidebarMenu) {
    item.expanded = !item.expanded;
  }

  // ✅ Tooltip: Only show when collapsed AND NOT hovered
  getTooltip(label: string): string {
    return (this.layout.isCollapsed() && !this.isHovered) ? label : '';
  }

  // ✅ Handle Mouse Hover
  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }

  trackByLabel(index: number, item: SidebarMenu): string {
    return item.label;
  }
}
