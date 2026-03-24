import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { OrderManagementService } from '../../../order/services/order-management.service';
import { TableService } from '../../../pos/services/table.service';
import { Order, OrderStatus } from '../../../order/models/order.model';
import { ReportFilterComponent } from '../../shared/report-filter/report-filter.component';

@Component({
  selector: 'app-customer-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent],
  templateUrl: './customer-report.component.html',
  styleUrls: ['./customer-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'visits';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 5;
  filterConfig = { showBranch: true, showCategory: false, showStaff: false };

  stats: any[] = [];
  visitBars: any[] = [];
  peakHours: any[] = [];
  topCustomers: any[] = [];
  donutData: any[] = [];
  donutTotal = '0';
  lineData: { x: number; y: number; label: string }[] = [];
  linePoints = '';
  lineAreaPath = '';
  insights: any[] = [];
  alerts: any[] = [];

  constructor(
    private orderSvc: OrderManagementService,
    private tableSvc: TableService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.orderSvc.allOrders$.pipe(takeUntil(this.destroy$)).subscribe(orders => {
      const tableStats = this.tableSvc.getTableStats();
      this.computeStats(orders, tableStats.occupancyRate);
      this.computeVisitBars(orders);
      this.computePeakHours(orders);
      this.computeTopCustomers(orders);
      this.computeLineChart(orders);
      this.computeInsights(orders, tableStats.occupancyRate);
      this.cdr.markForCheck();
    });
  }

  private computeStats(orders: Order[], occupancyRate: number) {
    const totalVisits = orders.length;
    const customerNames = orders
      .map(o => o.customerName)
      .filter((n): n is string => !!n);
    const uniqueCustomers = new Set(customerNames).size;
    const customerCountMap = new Map<string, number>();
    customerNames.forEach(n => customerCountMap.set(n, (customerCountMap.get(n) || 0) + 1));
    const returningCount = [...customerCountMap.values()].filter(v => v > 1).length;
    const returnRate = uniqueCustomers > 0 ? Math.round((returningCount / uniqueCustomers) * 100) : 0;

    this.stats = [
      { value: totalVisits.toLocaleString('en-IN'), label: 'TOTAL VISITS',    delta: '+15% ↑', up: true, color: 'blue'  },
      { value: uniqueCustomers.toString(),          label: 'UNIQUE CUSTOMERS', delta: '+22% ↑', up: true, color: 'green' },
      { value: returnRate + '%',                    label: 'RETURN RATE',     delta: '+5% ↑',  up: true, color: 'amber' },
      { value: Math.round(occupancyRate) + '%',     label: 'TABLE OCCUPANCY', delta: '+3% ↑',  up: true, color: 'green' }
    ];

    this.donutData = this.buildDonut([
      { label: 'Returning', value: returningCount || 1,                             color: '#1d4ed8' },
      { label: 'New',       value: Math.max(uniqueCustomers - returningCount, 1),   color: '#7c3aed' }
    ]);
    this.donutTotal = uniqueCustomers.toString();
  }

  private computeVisitBars(orders: Order[]) {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayCounts = new Array(7).fill(0);
    orders.forEach(o => {
      const d = new Date(o.orderTime).getDay();
      dayCounts[d === 0 ? 6 : d - 1]++;
    });
    const maxCount = Math.max(...dayCounts) || 1;
    this.visitBars = dayLabels.map((label, i) => ({
      label,
      value: dayCounts[i].toString(),
      pct: Math.round(dayCounts[i] / maxCount * 100),
      color: '#7c3aed'
    }));
  }

  private computePeakHours(orders: Order[]) {
    const slots = [
      { label: '7–10 AM',  min: 7,  max: 10 },
      { label: '12–3 PM',  min: 12, max: 15 },
      { label: '4–6 PM',   min: 16, max: 18 },
      { label: '7–11 PM',  min: 19, max: 23 }
    ];
    this.peakHours = slots.map(slot => {
      const slotOrders = orders.filter(o => {
        const h = new Date(o.orderTime).getHours();
        return h >= slot.min && h < slot.max;
      });
      const covers = slotOrders.length;
      const revenue = slotOrders.reduce((s, o) => s + o.totalAmount, 0);
      const maxSlot = orders.length || 1;
      const occ = Math.round(covers / maxSlot * 100);
      return {
        slot: slot.label,
        covers,
        revenue: '₹' + revenue.toLocaleString('en-IN'),
        occupancy: occ + '%',
        occClass: occ >= 80 ? 'badge-green' : occ >= 50 ? 'badge-amber' : 'badge-red'
      };
    });
  }

  private computeTopCustomers(orders: Order[]) {
    const map = new Map<string, { visits: number; totalSpent: number; lastOrder: Date }>();
    orders.forEach(o => {
      if (!o.customerName) return;
      const cur = map.get(o.customerName) || { visits: 0, totalSpent: 0, lastOrder: new Date(0) };
      const orderDate = new Date(o.orderTime);
      map.set(o.customerName, {
        visits: cur.visits + 1,
        totalSpent: cur.totalSpent + o.totalAmount,
        lastOrder: orderDate > cur.lastOrder ? orderDate : cur.lastOrder
      });
    });
    this.topCustomers = Array.from(map.entries())
      .sort((a, b) => b[1].visits - a[1].visits)
      .slice(0, 10)
      .map(([name, data]) => {
        const avgOrder = data.visits ? Math.round(data.totalSpent / data.visits) : 0;
        const daysAgo = Math.floor((Date.now() - data.lastOrder.getTime()) / 86400000);
        const lastVisit = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
        return {
          name,
          visits: data.visits,
          totalSpent: '₹' + data.totalSpent.toLocaleString('en-IN'),
          avgOrder: '₹' + avgOrder,
          lastVisit,
          type: data.visits >= 5 ? 'VIP' : data.visits >= 2 ? 'Regular' : 'New'
        };
      });
    if (!this.topCustomers.length) {
      this.topCustomers = [{ name: 'No data', visits: 0, totalSpent: '₹0', avgOrder: '₹0', lastVisit: '—', type: 'New' }];
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

  private computeInsights(orders: Order[], occupancyRate: number) {
    const totalVisits = orders.length;
    const dayCounts = new Array(7).fill(0);
    orders.forEach(o => {
      const d = new Date(o.orderTime).getDay();
      dayCounts[d === 0 ? 6 : d - 1]++;
    });
    const peakDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const peakDay = dayNames[peakDayIdx] || 'N/A';
    const peakCount = dayCounts[peakDayIdx] || 0;
    const customerNames = orders.map(o => o.customerName).filter(Boolean) as string[];
    const uniqueCustomers = new Set(customerNames).size;
    const customerCountMap = new Map<string, number>();
    customerNames.forEach(n => customerCountMap.set(n, (customerCountMap.get(n) || 0) + 1));
    const returningCount = [...customerCountMap.values()].filter(v => v > 1).length;
    const returnRate = uniqueCustomers > 0 ? Math.round((returningCount / uniqueCustomers) * 100) : 0;

    this.insights = [
      { icon: 'trending_up', text: `Total visits: ${totalVisits.toLocaleString('en-IN')}`,  type: 'up'   },
      { icon: 'repeat',      text: `Return rate: ${returnRate}%`,                            type: returnRate >= 50 ? 'up' : 'info' },
      { icon: 'today',       text: `Peak day: ${peakDay} (${peakCount} visits)`,             type: 'info' },
      { icon: 'table_bar',   text: `Table occupancy: ${Math.round(occupancyRate)}%`,         type: occupancyRate >= 70 ? 'up' : 'info' }
    ];
    this.alerts = returnRate < 30
      ? [{ icon: 'warning', text: `Low return rate (${returnRate}%) — consider loyalty programmes`, type: 'warn' }]
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

  get filteredCustomers() {
    let data = [...this.topCustomers];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'visits' ? a.visits - b.visits : a.name.localeCompare(b.name);
      return this.sortDir === 'asc' ? v : -v;
    });
    return data;
  }

  get pagedCustomers() {
    return this.filteredCustomers.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
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
    const rows = [['Name', 'Visits', 'Total Spent', 'Avg Order', 'Last Visit', 'Type']];
    this.topCustomers.forEach(c => rows.push([c.name, String(c.visits), c.totalSpent, c.avgOrder, c.lastVisit, c.type]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'customer-report.csv';
    a.click();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
