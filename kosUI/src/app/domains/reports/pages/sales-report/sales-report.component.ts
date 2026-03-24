import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { OrderManagementService } from '../../../order/services/order-management.service';
import { Order, OrderType, OrderStatus } from '../../../order/models/order.model';
import { ReportFilterComponent } from '../../shared/report-filter/report-filter.component';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'rank';
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;
  pageSize = 5;
  filterConfig = { showBranch: true, showCategory: true, showStaff: true, showStatus: true, showPayment: true };

  stats: any[] = [];
  topItems: any[] = [];
  orderTypeBars: any[] = [];
  donutData: any[] = [];
  donutTotal = '₹0';
  lineData: { x: number; y: number; label: string }[] = [];
  linePoints = '';
  lineAreaPath = '';
  insights: any[] = [];
  alerts: any[] = [];

  constructor(private orderSvc: OrderManagementService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.orderSvc.allOrders$.pipe(takeUntil(this.destroy$)).subscribe(orders => {
      this.computeStats(orders);
      this.computeTopItems(orders);
      this.computeOrderTypeBars(orders);
      this.computeLineChart(orders);
      this.computeInsights(orders);
      this.cdr.markForCheck();
    });
  }

  private computeStats(orders: Order[]) {
    const served = orders.filter(o => o.status === OrderStatus.SERVED);
    const totalRevenue = served.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders = orders.length;
    const avgOrder = served.length ? Math.round(totalRevenue / served.length) : 0;
    const fulfilment = totalOrders ? Math.round((served.length / totalOrders) * 100) : 0;
    this.stats = [
      { value: '₹' + totalRevenue.toLocaleString('en-IN'), label: 'REVENUE',    delta: '+12% ↑', up: true,           color: 'blue'  },
      { value: totalOrders.toString(),                      label: 'ORDERS',     delta: '+8% ↑',  up: true,           color: 'green' },
      { value: '₹' + avgOrder,                             label: 'AVG ORDER',  delta: '+3% ↑',  up: true,           color: 'amber' },
      { value: fulfilment + '%',                            label: 'FULFILMENT', delta: fulfilment > 90 ? '+1% ↑' : '-1% ↓', up: fulfilment > 90, color: 'green' }
    ];
  }

  private computeTopItems(orders: Order[]) {
    const map = new Map<string, { qty: number; revenue: number; category: string }>();
    orders.filter(o => o.status === OrderStatus.SERVED).forEach(o => {
      o.items.forEach(item => {
        const cur = map.get(item.name) || { qty: 0, revenue: 0, category: item.category || 'General' };
        map.set(item.name, { qty: cur.qty + item.quantity, revenue: cur.revenue + (item.price * item.quantity), category: cur.category });
      });
    });
    this.topItems = Array.from(map.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map((e, i) => ({
        rank: i + 1,
        item: e[0],
        category: e[1].category,
        qty: e[1].qty,
        revenue: '₹' + e[1].revenue.toLocaleString('en-IN'),
        trendUp: true,
        trend: '↑'
      }));
    if (!this.topItems.length) {
      this.topItems = [{ rank: 1, item: 'No data yet', category: '—', qty: 0, revenue: '₹0', trendUp: true, trend: '→' }];
    }
  }

  private computeOrderTypeBars(orders: Order[]) {
    const served = orders.filter(o => o.status === OrderStatus.SERVED);
    const dineIn   = served.filter(o => o.type === OrderType.DINE_IN).reduce((s, o) => s + o.totalAmount, 0);
    const takeaway = served.filter(o => o.type === OrderType.TAKEAWAY).reduce((s, o) => s + o.totalAmount, 0);
    const delivery = served.filter(o => o.type === OrderType.DELIVERY).reduce((s, o) => s + o.totalAmount, 0);
    const total = dineIn + takeaway + delivery || 1;
    this.orderTypeBars = [
      { label: 'Dine-In',  value: '₹' + dineIn.toLocaleString('en-IN'),   pct: Math.round(dineIn / total * 100),   color: '#1d4ed8' },
      { label: 'Takeaway', value: '₹' + takeaway.toLocaleString('en-IN'), pct: Math.round(takeaway / total * 100), color: '#7c3aed' },
      { label: 'Delivery', value: '₹' + delivery.toLocaleString('en-IN'), pct: Math.round(delivery / total * 100), color: '#d97706' }
    ];
    this.donutData = this.buildDonut([
      { label: 'Dine-In',  value: dineIn   || 1, color: '#1d4ed8' },
      { label: 'Takeaway', value: takeaway || 1, color: '#7c3aed' },
      { label: 'Delivery', value: delivery || 1, color: '#d97706' }
    ]);
    const grandTotal = dineIn + takeaway + delivery;
    this.donutTotal = grandTotal >= 1000
      ? '₹' + Math.round(grandTotal / 1000) + 'K'
      : '₹' + grandTotal;
  }

  private computeLineChart(orders: Order[]) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = new Array(7).fill(0);
    orders.filter(o => o.status === OrderStatus.SERVED).forEach(o => {
      const d = new Date(o.orderTime).getDay();
      const idx = d === 0 ? 6 : d - 1;
      buckets[idx] += o.totalAmount;
    });
    this.lineData = this.buildLine(buckets.map(v => v || 100), days);
  }

  private computeInsights(orders: Order[]) {
    const served = orders.filter(o => o.status === OrderStatus.SERVED);
    const cancelled = orders.filter(o => o.status === OrderStatus.CANCELLED);
    const totalRevenue = served.reduce((s, o) => s + o.totalAmount, 0);
    const itemMap = new Map<string, number>();
    served.forEach(o => o.items.forEach(i => itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity)));
    const topItem = itemMap.size ? [...itemMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : 'N/A';
    const dayCounts = new Array(7).fill(0);
    served.forEach(o => {
      const d = new Date(o.orderTime).getDay();
      dayCounts[d === 0 ? 6 : d - 1]++;
    });
    const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const topDay = dayNames[peakDayIdx] || 'N/A';
    const cancRate = orders.length ? Math.round(cancelled.length / orders.length * 100) : 0;
    this.insights = [
      { icon: 'trending_up',  text: `Total revenue: ₹${totalRevenue.toLocaleString('en-IN')}`, type: 'up'   },
      { icon: 'star',         text: `Top item: ${topItem}`,                                      type: 'info' },
      { icon: 'schedule',     text: `Most orders on: ${topDay}`,                                type: 'info' },
      { icon: cancRate > 10 ? 'warning' : 'check_circle', text: `Cancellation rate: ${cancRate}%`, type: cancRate > 10 ? 'down' : 'up' }
    ];
    this.alerts = cancRate > 10
      ? [{ icon: 'notification_important', text: `High cancellation rate: ${cancRate}% — review order workflow`, type: 'warn' }]
      : [];
  }

  buildDonut(items: { label: string; value: number; color: string }[]) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let offset = 0;
    return items.map(i => {
      const pct = (i.value / total) * 100;
      const seg = { ...i, pct, offset };
      offset += pct;
      return seg;
    });
  }

  buildLine(values: number[], labels: string[]) {
    const max = Math.max(...values) || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * 192 + 4,
      y: 76 - (v / max) * 64,
      label: labels[i]
    }));
    this.linePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
    this.lineAreaPath = `M${pts[0].x},76 ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},76 Z`;
    return pts;
  }

  get filteredItems() {
    let data = [...this.topItems];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(i => i.item.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'rank' ? a.rank - b.rank :
                this.sortCol === 'qty'  ? a.qty  - b.qty  :
                a.item.localeCompare(b.item);
      return this.sortDir === 'asc' ? v : -v;
    });
    return data;
  }

  get pagedItems() {
    return this.filteredItems.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
  }

  get pages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  sort(col: string) {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
    this.page = 1;
  }

  minVal(a: number, b: number) { return Math.min(a, b); }

  onFilterChange(f: any) { console.log('Filter:', f); }

  exportCSV() {
    const rows = [['Rank', 'Item', 'Category', 'Qty', 'Revenue']];
    this.topItems.forEach(i => rows.push([i.rank, i.item, i.category, i.qty, i.revenue]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'sales-report.csv';
    a.click();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
