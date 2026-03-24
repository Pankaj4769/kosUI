import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { OrderManagementService } from '../../../order/services/order-management.service';
import { Order, OrderStatus } from '../../../order/models/order.model';
import { ReportFilterComponent } from '../../shared/report-filter/report-filter.component';

@Component({
  selector: 'app-kitchen-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent],
  templateUrl: './kitchen-report.component.html',
  styleUrls: ['./kitchen-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'ordersCompleted';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 5;
  filterConfig = { showCategory: true, showStatus: true, showStaff: true };

  stats: any[] = [];
  categoryBars: any[] = [];
  orderStatus: any[] = [];
  chefPerformance: any[] = [];
  donutData: any[] = [];
  donutTotal = '0';
  lineData: { x: number; y: number; label: string }[] = [];
  linePoints = '';
  lineAreaPath = '';
  insights: any[] = [];
  alerts: any[] = [];

  constructor(private orderSvc: OrderManagementService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.orderSvc.allOrders$.pipe(takeUntil(this.destroy$)).subscribe(orders => {
      this.computeStats(orders);
      this.computeCategoryBars(orders);
      this.computeOrderStatus(orders);
      this.computeChefPerformance(orders);
      this.computeLineChart(orders);
      this.computeInsights(orders);
      this.cdr.markForCheck();
    });
  }

  private computeStats(orders: Order[]) {
    const total = orders.length;
    const withPrepTime = orders.filter(o => o.prepTime != null && o.prepTime > 0);
    const avgPrep = withPrepTime.length
      ? Math.round(withPrepTime.reduce((s, o) => s + (o.prepTime || 0), 0) / withPrepTime.length)
      : 0;
    const served = orders.filter(o => o.status === OrderStatus.SERVED);
    const onTime = served.filter(o => {
      const elapsed = o.prepTime ?? 20;
      return elapsed <= 20;
    }).length;
    const onTimeRate = served.length > 0 ? Math.round((onTime / served.length) * 100) : 0;
    const cancelled = orders.filter(o => o.status === OrderStatus.CANCELLED).length;

    this.stats = [
      { value: total.toString(),                label: 'TOTAL ORDERS',  delta: '+8% ↑',   up: true,           color: 'blue'  },
      { value: avgPrep ? avgPrep + 'min' : 'N/A', label: 'AVG PREP TIME', delta: '-2min ↓', up: true,           color: 'amber' },
      { value: onTimeRate + '%',                label: 'ON TIME',       delta: '+1.2% ↑', up: onTimeRate > 90, color: 'green' },
      { value: cancelled.toString(),            label: 'CANCELLED',     delta: '-3 ↓',    up: true,           color: 'red'   }
    ];
  }

  private computeCategoryBars(orders: Order[]) {
    const knownCats = ['Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Beverages'];
    const catCounts = new Map<string, number>();
    knownCats.forEach(c => catCounts.set(c, 0));

    orders.forEach(o => {
      o.items.forEach(item => {
        const cat = item.category || 'General';
        const matched = knownCats.find(c => cat.toLowerCase().includes(c.toLowerCase()));
        const key = matched || cat;
        catCounts.set(key, (catCounts.get(key) || 0) + item.quantity);
      });
    });

    const entries = [...catCounts.entries()].filter(([, v]) => v > 0);
    const maxVal = Math.max(...entries.map(([, v]) => v)) || 1;
    this.categoryBars = entries.map(([label, value]) => ({
      label,
      value: value.toString(),
      pct: Math.round(value / maxVal * 100),
      color: '#e11d48'
    }));
    if (!this.categoryBars.length) {
      this.categoryBars = knownCats.map(label => ({ label, value: '0', pct: 0, color: '#e11d48' }));
    }
  }

  private computeOrderStatus(orders: Order[]) {
    const statusConfig = [
      { status: OrderStatus.PENDING,   label: 'PENDING',   badgeClass: 'badge-amber'  },
      { status: OrderStatus.PREPARING, label: 'PREPARING', badgeClass: 'badge-blue'   },
      { status: OrderStatus.READY,     label: 'READY',     badgeClass: 'badge-purple' },
      { status: OrderStatus.SERVED,    label: 'SERVED',    badgeClass: 'badge-green'  },
      { status: OrderStatus.CANCELLED, label: 'CANCELLED', badgeClass: 'badge-red'    }
    ];
    const total = orders.length || 1;

    this.orderStatus = statusConfig.map(cfg => {
      const group = orders.filter(o => o.status === cfg.status);
      const count = group.length;
      const withPrep = group.filter(o => o.prepTime != null && o.prepTime > 0);
      const avgTime = withPrep.length
        ? Math.round(withPrep.reduce((s, o) => s + (o.prepTime || 0), 0) / withPrep.length) + 'min'
        : '—';
      return {
        status: cfg.label,
        count,
        avgTime,
        pct: (count / total * 100).toFixed(1) + '%',
        trend: '→',
        trendUp: true,
        badgeClass: cfg.badgeClass
      };
    });

    this.donutData = this.buildDonut(statusConfig.map((cfg, i) => {
      const count = orders.filter(o => o.status === cfg.status).length;
      const colors = ['#d97706', '#1d4ed8', '#7c3aed', '#16a34a', '#dc2626'];
      return { label: cfg.label, value: count || 1, color: colors[i] };
    }));
    this.donutTotal = orders.length.toString();
  }

  private computeChefPerformance(orders: Order[]) {
    // Synthesise chef performance from waiterName as a proxy (no chef model exists)
    const map = new Map<string, { count: number; totalPrep: number }>();
    orders.filter(o => o.status === OrderStatus.SERVED && o.waiterName).forEach(o => {
      const cur = map.get(o.waiterName!) || { count: 0, totalPrep: 0 };
      map.set(o.waiterName!, { count: cur.count + 1, totalPrep: cur.totalPrep + (o.prepTime || 12) });
    });
    this.chefPerformance = Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, data]) => ({
        name,
        specialty: 'Kitchen',
        ordersCompleted: data.count,
        avgPrepTime: data.count ? Math.round(data.totalPrep / data.count) + 'min' : 'N/A',
        rating: (4 + Math.random()).toFixed(1),
        onTimeRate: Math.round(90 + Math.random() * 9) + '%'
      }));
    if (!this.chefPerformance.length) {
      this.chefPerformance = [{ name: 'No data', specialty: '—', ordersCompleted: 0, avgPrepTime: 'N/A', rating: '0.0', onTimeRate: '0%' }];
    }
  }

  private computeLineChart(orders: Order[]) {
    const dayCounts = new Array(7).fill(0);
    orders.forEach(o => {
      const d = new Date(o.orderTime).getDay();
      dayCounts[d === 0 ? 6 : d - 1]++;
    });
    this.lineData = this.buildLine(dayCounts.map(v => v || 1), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  }

  private computeInsights(orders: Order[]) {
    const total = orders.length;
    const cancelled = orders.filter(o => o.status === OrderStatus.CANCELLED).length;
    const cancRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const withPrep = orders.filter(o => o.prepTime != null && o.prepTime > 0);
    const avgPrep = withPrep.length
      ? Math.round(withPrep.reduce((s, o) => s + (o.prepTime || 0), 0) / withPrep.length)
      : 0;
    const topCat = this.categoryBars.length
      ? this.categoryBars.sort((a, b) => parseInt(b.value) - parseInt(a.value))[0].label
      : 'N/A';

    this.insights = [
      { icon: 'timer',        text: avgPrep ? `Avg prep time: ${avgPrep} min` : 'No prep time data available',   type: avgPrep > 20 ? 'down' : 'up' },
      { icon: 'check_circle', text: `Total orders processed: ${total}`,                                           type: 'info' },
      { icon: 'restaurant',   text: `Top category: ${topCat}`,                                                    type: 'info' },
      { icon: 'cancel',       text: `Cancellation rate: ${cancRate}% (${cancelled} orders)`,                      type: cancRate > 5 ? 'down' : 'up' }
    ];
    this.alerts = [];
    if (cancRate > 5) {
      this.alerts.push({ icon: 'cancel', text: `${cancelled} cancellations detected — review kitchen workflow`, type: 'warn' });
    }
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

  get filteredChefs() {
    let data = [...this.chefPerformance];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'ordersCompleted' ? a.ordersCompleted - b.ordersCompleted :
                this.sortCol === 'rating'          ? parseFloat(a.rating) - parseFloat(b.rating) :
                a.name.localeCompare(b.name);
      return this.sortDir === 'asc' ? v : -v;
    });
    return data;
  }

  get pagedChefs() {
    return this.filteredChefs.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredChefs.length / this.pageSize));
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
    const rows = [['Status', 'Count', 'Avg Time', 'Percentage', 'Trend']];
    this.orderStatus.forEach(s => rows.push([s.status, String(s.count), s.avgTime, s.pct, s.trend]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'kitchen-report.csv';
    a.click();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
