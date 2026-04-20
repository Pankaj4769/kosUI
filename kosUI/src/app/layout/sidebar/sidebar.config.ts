import { SidebarItem } from './sidebar.model';

export const SIDEBAR_MENU: SidebarItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    route: '/dashboard',
    groupLabel: 'Main'
  },
  {
    label: 'Orders',
    icon: 'shopping_cart',
    groupLabel: 'Operations',
    children: [
      { label: 'Live Orders',    icon: 'receipt_long',  route: '/orders/live' },
      { label: 'Order History',  icon: 'history',       route: '/orders/history' },
    ]
  },
  {
    label: 'Inventory',
    icon: 'inventory_2',
    children: [
      { label: 'Inventory Dashboard', icon: 'bar_chart',     route: '/inventory/dashboard' },
      { label: 'Manage Inventory',    icon: 'inventory_2',   route: '/inventory/manage' },
      { label: 'Categories',          icon: 'label',          route: '/inventory/categories' },
      { label: 'Stock Alerts',        icon: 'warning_amber',  route: '/inventory/alerts' },
    ]
  },
  {
    label: 'POS',
    icon: 'point_of_sale',
    groupLabel: 'Point of Sale',
    children: [
      { label: 'Cashier', icon: 'point_of_sale',   route: '/pos' },
      { label: 'Menu',    icon: 'restaurant_menu', route: '/pos/menu' },
      { label: 'Tables',  icon: 'table_bar',       route: '/pos/tables' },
    ]
  },
  {
    label: 'System',
    icon: 'settings',
    groupLabel: 'Administration',
    children: [
      { label: 'QR Codes', icon: 'qr_code_2', route: '/qr' },
      { label: 'Settings', icon: 'settings',  route: '/settings' },
      { label: 'Users',    icon: 'group',     route: '/users' },
    ]
  }
];
