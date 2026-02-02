import { Injectable } from '@angular/core';
import { StaffAnalytics } from '../models/staff.model';

@Injectable({ providedIn: 'root' })
export class StaffAnalyticsService {

  calculate(waiterName: string, tables: any[], orders: any[]): StaffAnalytics {

    const activeTables = tables.filter(t => t.waiter === waiterName && t.status !== 'FREE');
    const activeOrders = orders.filter(o => o.waiter === waiterName && o.status === 'ACTIVE');
    const completedOrders = orders.filter(o => o.waiter === waiterName && o.status === 'PAID');

    const revenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    const avgServiceTime =
      completedOrders.length === 0
        ? 0
        : Math.round(
            completedOrders.reduce((sum, o) => sum + (o.duration || 0), 0) /
            completedOrders.length
          );

    // 🔥 LOAD SCORE (0–100)
    const loadScore = Math.min((activeTables.length + activeOrders.length) * 10, 100);

    // ⚡ EFFICIENCY SCORE
    const efficiencyScore = avgServiceTime === 0
      ? 100
      : Math.max(100 - avgServiceTime, 10);

    // 💰 PRODUCTIVITY SCORE
    const productivityScore = Math.min(revenue / 50, 100);

    // 🧠 OVERALL SCORE (enterprise formula)
    const overallScore = Math.round(
      loadScore * 0.3 +
      efficiencyScore * 0.4 +
      productivityScore * 0.3
    );

    return {
      name: waiterName,
      activeTables: activeTables.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      avgServiceTime,
      revenue,
      loadScore,
      efficiencyScore,
      productivityScore,
      overallScore
    };
  }
}
