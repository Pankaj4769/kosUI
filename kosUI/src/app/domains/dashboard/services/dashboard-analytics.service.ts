import { Injectable } from '@angular/core';
import { InventoryService } from './inventory.service';
import { DashboardKPI, CategoryStat, Alert, TopSellingItem, RecentOrder } from '../models/dashboard-analytics.model';
import { Item } from '../models/item.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardAnalyticsService {

  constructor(private inventory: InventoryService) {}

  // ===== KPI WITH ICONS & COLORS =====

  generateKPIs(): DashboardKPI[] {

    const items = this.inventory.getAllItems();

    const inventoryValue = items.reduce(
      (sum: number, i: Item) => sum + (i.price * i.qty),
      0
    );

    const lowStock = items.filter((i: Item) => i.qty <= 5).length;

    const soldOut = items.filter((i: Item) => i.qty === 0).length;

    const totalItems = items.length;

    return [
      {
        title: 'Inventory Value',
        value: `₹${inventoryValue}`,
        sub: 'Current stock worth',

        trend: inventoryValue > 0 ? 'up' : 'stable',
        trendText: inventoryValue > 0 ? 'Revenue Healthy' : 'No Sales',

        icon: 'payments',
        color: '#22c55e',
        gradient: 'linear-gradient(135deg, #22c55e, #16a34a)'
      },

      {
        title: 'Total Items',
        value: totalItems,
        sub: 'Items in inventory',

        trend: totalItems > 0 ? 'up' : 'stable',
        trendText: 'Inventory Size',

        icon: 'inventory_2',
        color: '#3b82f6',
        gradient: 'linear-gradient(135deg, #3b82f6, #1e40af)'
      },

      {
        title: 'Low Stock Items',
        value: lowStock,
        sub: 'Needs attention',

        trend: lowStock > 0 ? 'down' : 'stable',
        trendText: lowStock > 0 ? 'Action Required' : 'All Good',

        icon: 'warning',
        color: '#f59e0b',
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
      },

      {
        title: 'Sold Out',
        value: soldOut,
        sub: 'Unavailable items',

        trend: soldOut > 0 ? 'down' : 'stable',
        trendText: soldOut > 0 ? 'Critical Stock' : 'Fully Available',

        icon: 'cancel',
        color: '#ef4444',
        gradient: 'linear-gradient(135deg, #ef4444, #b91c1c)'
      }
    ];
  }

  // ===== CATEGORY STATS WITH COLORS =====

  // categoryStats(): CategoryStat[] {

  //   const items = this.inventory.getAllItems();

  //   const categories = Array.from(
  //     new Set(items.map(i => i.category))
  //   );

  //   const colorMap: any = {
  //     Breakfast: '#3b82f6',
  //     Lunch: '#22c55e',
  //     Snacks: '#f59e0b',
  //     Dinner: '#6366f1'
  //   };

  //   return categories.map(cat => {

  //     const count = items.filter(i => i.category === cat).length;

  //     return {
  //       name: cat,
  //       percent: items.length
  //         ? Math.round((count / items.length) * 100)
  //         : 0,
  //       color: colorMap[cat[0]] || '#94a3b8'
  //     };

  //   });
  // }

  // ===== ALERTS =====

  generateAlerts(): Alert[] {

    return [
    {
      message: 'Paneer Tikka is Sold Out',
      type: 'error'
    },
    {
      message: 'Chicken Biryani stock running low (2 left)',
      type: 'warning'
    },
    {
      message: 'Masala Dosa almost finished',
      type: 'warning'
    },
    {
      message: 'System maintenance due tonight',
      type: 'info'
    },
    {
      message: 'Cold Coffee unavailable',
      type: 'error'
    }
  ];

    const items = this.inventory.getAllItems();

    const alerts: Alert[] = [];

    items.forEach((i: Item) => {

      if (i.qty === 0) {
        alerts.push({
          message: `${i.name} is sold out`,
          type: 'error'
        });
      }
      else if (i.qty <= 3) {
        alerts.push({
          message: `${i.name} running low (${i.qty})`,
          type: 'warning'
        });
      }

    });

    return alerts.slice(0, 10);
  }

  // ===== TOP SELLING ITEMS =====

  // getTopSellingItems(): TopSellingItem[] {

  //   const items = this.inventory.getAllItems();

  //   return items
  //     .filter(i => i.qty > 0)
  //     .sort((a, b) => (b.price * b.qty) - (a.price * a.qty))
  //     .slice(0, 5)
  //     .map(i => ({
  //       name: i.name,
  //       sold: i.qty,
  //       revenue: `₹${i.price * i.qty}`,
  //       image: i.image || 'assets/food/default.jpg',
  //       category: i.category
  //     }));
  // }
    getRecentOrders(): RecentOrder[] {

  // Later this can be replaced with API call
  return [
    {
      id: 101,
      items: 3,
      amount: 450,
      time: '10:30 AM',
      status: 'Completed'
    },
    {
      id: 102,
      items: 2,
      amount: 280,
      time: '11:15 AM',
      status: 'Pending'
    },
    {
      id: 103,
      items: 5,
      amount: 760,
      time: '12:05 PM',
      status: 'Completed'
    },
    {
      id: 104,
      items: 1,
      amount: 120,
      time: '12:40 PM',
      status: 'Cancelled'
    }
  ];
}

  
}
