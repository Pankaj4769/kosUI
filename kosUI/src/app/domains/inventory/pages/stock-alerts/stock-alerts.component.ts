import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface AlertItem {
  item: string;
  category: string;
  type: string;
  severity: string;
  stockOrExpiry: string;
  action: string;
}

interface LowStockItem {
  item: string;
  category: string;
  currentStock: number;
  unit: string;
  minThreshold: number;
  status: string;
}

interface ExpiryItem {
  item: string;
  batchNo: string;
  quantity: string;
  expiryDate: string;
  daysLeft: number;
  status: string;
}

interface AlertSettings {
  lowStockThreshold: number;
  criticalThreshold: number;
  expiryAlertDays: number;
  emailNotifications: boolean;
  smsAlerts: boolean;
}

@Component({
  selector: 'app-stock-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './stock-alerts.component.html',
  styleUrls: ['./stock-alerts.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockAlertsComponent {
  activeTab: 'dashboard' | 'low-stock' | 'expiry' | 'settings' = 'dashboard';
  showInfo = false;
  searchText = '';
  filterCategory = '';

  stats = [
    { label: 'Total Alerts', value: '12', color: 'red' },
    { label: 'Critical', value: '3', color: 'red' },
    { label: 'Low Stock Items', value: '7', color: 'amber' },
    { label: 'Expiring Soon', value: '5', color: 'orange' }
  ];

  insights = [
    { icon: 'warning', text: '3 items critically low', type: 'alert' },
    { icon: 'schedule', text: '5 items expiring within 7 days', type: 'warn' },
    { icon: 'remove_shopping_cart', text: '2 items out of stock', type: 'down' }
  ];

  alertItems: AlertItem[] = [
    { item: 'Basmati Rice', category: 'Grains', type: 'Low Stock', severity: 'Critical', stockOrExpiry: '2 kg', action: 'Reorder' },
    { item: 'Tomatoes', category: 'Vegetables', type: 'Low Stock', severity: 'High', stockOrExpiry: '1.5 kg', action: 'Reorder' },
    { item: 'Milk', category: 'Dairy', type: 'Expiry Alert', severity: 'Medium', stockOrExpiry: 'Exp: 2 days', action: 'Use First' },
    { item: 'Chicken Breast', category: 'Meat', type: 'Out of Stock', severity: 'Critical', stockOrExpiry: '0 kg', action: 'Urgent Order' },
    { item: 'Onions', category: 'Vegetables', type: 'Low Stock', severity: 'Low', stockOrExpiry: '8 kg', action: 'Monitor' }
  ];

  lowStockItems: LowStockItem[] = [
    { item: 'Basmati Rice', category: 'Grains', currentStock: 2, unit: 'kg', minThreshold: 20, status: 'Critical' },
    { item: 'Tomatoes', category: 'Vegetables', currentStock: 1.5, unit: 'kg', minThreshold: 10, status: 'Critical' },
    { item: 'Chicken Breast', category: 'Meat', currentStock: 0, unit: 'kg', minThreshold: 5, status: 'Out of Stock' },
    { item: 'Onions', category: 'Vegetables', currentStock: 8, unit: 'kg', minThreshold: 15, status: 'Low' },
    { item: 'Cooking Oil', category: 'Condiments', currentStock: 3, unit: 'L', minThreshold: 10, status: 'Low' },
    { item: 'Salt', category: 'Spices', currentStock: 0.5, unit: 'kg', minThreshold: 5, status: 'Critical' },
    { item: 'Butter', category: 'Dairy', currentStock: 1.2, unit: 'kg', minThreshold: 4, status: 'Low' },
    { item: 'Green Chillies', category: 'Vegetables', currentStock: 0.8, unit: 'kg', minThreshold: 3, status: 'Low' },
    { item: 'Garlic', category: 'Vegetables', currentStock: 0.3, unit: 'kg', minThreshold: 2, status: 'Critical' },
    { item: 'Paneer', category: 'Dairy', currentStock: 1.8, unit: 'kg', minThreshold: 5, status: 'Low' }
  ];

  expiryItems: ExpiryItem[] = [
    { item: 'Fresh Milk', batchNo: 'BT-2026-0312', quantity: '10 L', expiryDate: '2026-03-28', daysLeft: 1, status: 'Urgent' },
    { item: 'Yogurt', batchNo: 'BT-2026-0288', quantity: '5 kg', expiryDate: '2026-03-29', daysLeft: 2, status: 'Urgent' },
    { item: 'Chicken Breast', batchNo: 'BT-2026-0301', quantity: '8 kg', expiryDate: '2026-03-30', daysLeft: 3, status: 'High' },
    { item: 'Fish Fillet', batchNo: 'BT-2026-0295', quantity: '4 kg', expiryDate: '2026-03-31', daysLeft: 4, status: 'High' },
    { item: 'Cream', batchNo: 'BT-2026-0278', quantity: '3 L', expiryDate: '2026-04-01', daysLeft: 5, status: 'Medium' },
    { item: 'Paneer', batchNo: 'BT-2026-0265', quantity: '6 kg', expiryDate: '2026-04-03', daysLeft: 7, status: 'Medium' },
    { item: 'Butter', batchNo: 'BT-2026-0240', quantity: '2 kg', expiryDate: '2026-04-05', daysLeft: 9, status: 'Low' },
    { item: 'Cheese', batchNo: 'BT-2026-0220', quantity: '1.5 kg', expiryDate: '2026-04-10', daysLeft: 14, status: 'Low' }
  ];

  settings: AlertSettings = {
    lowStockThreshold: 10,
    criticalThreshold: 5,
    expiryAlertDays: 7,
    emailNotifications: true,
    smsAlerts: false
  };

  get filteredLowStock(): LowStockItem[] {
    return this.lowStockItems.filter(i =>
      i.item.toLowerCase().includes(this.searchText.toLowerCase()) ||
      i.category.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  getSeverityBadge(severity: string): string {
    const map: Record<string, string> = {
      Critical: 'badge-red',
      High: 'badge-amber',
      Medium: 'badge-blue',
      Low: 'badge-green'
    };
    return map[severity] || 'badge-blue';
  }

  getExpiryBadge(status: string): string {
    const map: Record<string, string> = {
      Urgent: 'badge-red',
      High: 'badge-amber',
      Medium: 'badge-blue',
      Low: 'badge-green'
    };
    return map[status] || 'badge-blue';
  }

  getLowStockBadge(status: string): string {
    const map: Record<string, string> = {
      Critical: 'badge-red',
      'Out of Stock': 'badge-red',
      Low: 'badge-amber'
    };
    return map[status] || 'badge-amber';
  }

  saveSettings(): void {
    // In production: call API to save settings
    console.log('Settings saved', this.settings);
  }
}
