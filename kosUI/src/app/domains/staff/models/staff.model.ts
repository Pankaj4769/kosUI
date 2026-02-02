export interface StaffAnalytics {
  name: string;

  activeTables: number;
  activeOrders: number;
  completedOrders: number;

  avgServiceTime: number; // minutes
  revenue: number; // ₹

  loadScore: number;        // 0–100
  efficiencyScore: number;  // 0–100
  productivityScore: number;// 0–100
  overallScore: number;     // 0–100
}
