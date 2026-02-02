import { SidebarItem } from './sidebar.model';

export const SIDEBAR_MENU: SidebarItem[] = [
  {
    label: 'Dashboard',
    icon: '🏠',
    route: '/dashboard'
  },
  {
    label: 'Inventory',
    icon: '📦',
    children: [
      { label: 'Inventory Dashboard', icon: '📊', route: '/inventory/dashboard' },
      { label: 'Manage Inventory', icon: '📦', route: '/inventory/manage' },
      { label: 'Stock Alerts', icon: '⚠', route: '/inventory/alerts' },
    ]
  },
  {
    label: 'POS',
    icon: '💳',
    children: [
      { label: 'Cashier', icon: '💳', route: '/pos' },
      { label: 'Menu', icon: '🍽', route: '/pos/menu' },
      { label: 'Tables', icon: 'table_bar', route: '/pos/tables' },// ✅ Table Dashboard
      { label: 'Tables', icon: '🪑', route: '/pos/tables' },
    ]
  },
  {
    label: 'Orders',
    icon: '🛒',
    children: [
      { label: 'Live Orders', icon: '🛒', route: '/orders/live' },
      { label: 'Order History', icon: '📜', route: '/orders/history' },
    ]
  },
  {
    label: 'System',
    icon: '⚙',
    children: [
      { label: 'QR Codes', icon: '🔳', route: '/qr' },
      { label: 'Settings', icon: '⚙', route: '/settings' },
      { label: 'Users', icon: '👤', route: '/users' },
    ]
  }
];
