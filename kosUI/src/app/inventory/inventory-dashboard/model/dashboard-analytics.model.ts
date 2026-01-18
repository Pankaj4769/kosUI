export interface DashboardKPI {
  title: string;
  value: number | string;
  sub: string;

  trend: 'up' | 'down' | 'stable';
  trendText: string;

  icon: string;      // NEW
  color: string;     // NEW
  gradient: string;  // NEW
}

export interface CategoryStat {
  name: string;
  percent: number;
  color: string;
}

export interface Alert {
  message: string;
  type: 'warning' | 'info' | 'error';
}

export interface TopSellingItem {
  name: string;
  sold: number;
  revenue: string;
  image: string;
  category: string;
}

export interface RecentOrder {
  id: number;
  items: number;
  amount: number;
  time: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}
