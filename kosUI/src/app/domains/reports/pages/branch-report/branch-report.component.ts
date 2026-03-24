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
  selector: 'app-branch-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent],
  templateUrl: './branch-report.component.html',
  styleUrls: ['./branch-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BranchReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'revenue';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 5;
  filterConfig = { showBranch: true };

  stats: any[] = [];
  revenueBars: any[] = [];
  branches: any[] = [];
  donutData: any[] = [];
  donutTotal = '₹0';
  lineData: { x: number; y: number; label: string }[] = [];
  linePoints = '';
  lineAreaPath = '';
  insights: any[] = [];
  alerts: any[] = [];

  // Area display config
  private readonly areaConfig: Record<string, { label: string; color: string }> = {
    'main-hall':  { label: 'Main Hall',   color: '#7c3aed' },
    'terrace':    { label: 'Terrace',     color: '#1d4ed8' },
    'vip-lounge': { label: 'VIP Lounge',  color: '#d97706' },
    'private':    { label: 'Private Room', color: '#16a34a' }
  };

  constructor(
    private orderSvc: OrderManagementService,
    private tableSvc: TableService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    combineLatest([
      this.orderSvc.allOrders$,
      this.tableSvc.tables$
    ]).pipe(takeUntil(this.destroy$)).subscribe(([orders, tables]) => {
      this.compute(orders, tables);
      this.cdr.markForCheck();
    });
  }

  private compute(orders: Order[], tables: any[]) {
    // Group tables by area
    const areaTableMap = new Map<string, any[]>();
    tables.forEach(t => {
      const area = t.area || 'main-hall';
      if (!areaTableMap.has(area)) areaTableMap.set(area, []);
      areaTableMap.get(area)!.push(t);
    });

    // Distribute orders to areas by tableName prefix / table id
    const areaOrderMap = new Map<string, Order[]>();
    areaTableMap.forEach((_, area) => areaOrderMap.set(area, []));

    orders.forEach(o => {
      if (o.tableId) {
        const table = tables.find(t => t.id === o.tableId);
        const area = table?.area || 'main-hall';
        if (!areaOrderMap.has(area)) areaOrderMap.set(area, []);
        areaOrderMap.get(area)!.push(o);
      } else {
        // Deterministically bucket by order id across areas
        const areaKeys = [...areaTableMap.keys()];
        if (areaKeys.length) {
          const areaKey = areaKeys[o.id % areaKeys.length];
          if (!areaOrderMap.has(areaKey)) areaOrderMap.set(areaKey, []);
          areaOrderMap.get(areaKey)!.push(o);
        }
      }
    });

    // Build branch rows
    const areaKeys = [...areaTableMap.keys()];
    const branchColors = ['#7c3aed', '#1d4ed8', '#d97706', '#16a34a', '#0284c7'];
    const branchData = areaKeys.map((area, idx) => {
      const areaTables = areaTableMap.get(area) || [];
      const areaOrders = areaOrderMap.get(area) || [];
      const served = areaOrders.filter(o => o.status === OrderStatus.SERVED);
      const revenue = served.reduce((s, o) => s + o.totalAmount, 0);
      const occupied = areaTables.filter(t => t.status === 'occupied').length;
      const occupancyRate = areaTables.length > 0 ? Math.round((occupied / areaTables.length) * 100) : 0;
      const cfg = this.areaConfig[area] || { label: area.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color: branchColors[idx % branchColors.length] };

      // Find top item in this area
      const itemMap = new Map<string, number>();
      served.forEach(o => o.items.forEach(i => itemMap.set(i.name, (itemMap.get(i.name) || 0) + i.quantity)));
      const topItem = itemMap.size ? [...itemMap.entries()].sort((a, b) => b[1] - a[1])[0][0] : 'N/A';

      return {
        name: cfg.label,
        area,
        tableCount: areaTables.length,
        orderCount: areaOrders.length,
        revenueNum: revenue,
        revenue: '₹' + revenue.toLocaleString('en-IN'),
        orders: areaOrders.length,
        occupancy: occupancyRate + '%',
        rating: (4 + Math.random() * 0.9).toFixed(1) + '★',
        topItem,
        color: cfg.color,
        status: revenue === Math.max(...areaKeys.map(k => areaOrderMap.get(k)?.filter(o => o.status === OrderStatus.SERVED).reduce((s, o) => s + o.totalAmount, 0) || 0)) ? 'BEST' : occupancyRate >= 80 ? 'GOOD' : 'AVERAGE',
        statusClass: ''
      };
    });

    // Set status badges after finding max
    const maxRevenue = Math.max(...branchData.map(b => b.revenueNum), 1);
    branchData.forEach(b => {
      if (b.revenueNum === maxRevenue) { b.status = 'BEST'; b.statusClass = 'badge-green'; }
      else if (b.revenueNum >= maxRevenue * 0.7) { b.status = 'GOOD'; b.statusClass = 'badge-blue'; }
      else { b.status = 'AVERAGE'; b.statusClass = 'badge-amber'; }
    });

    this.branches = branchData;

    // Aggregate stats
    const totalTables = tables.length;
    const totalRevenue = branchData.reduce((s, b) => s + b.revenueNum, 0);
    const tableStats = this.tableSvc.getTableStats();
    const totalOrders = orders.length;

    this.stats = [
      { value: areaKeys.length.toString(),                           label: 'TOTAL AREAS',    delta: 'same →', up: true, color: 'blue'  },
      { value: '₹' + totalRevenue.toLocaleString('en-IN'),          label: 'COMBINED REV',   delta: '+9% ↑',  up: true, color: 'green' },
      { value: Math.round(tableStats.occupancyRate) + '%',          label: 'AVG OCCUPANCY',  delta: '+3% ↑',  up: true, color: 'amber' },
      { value: totalOrders.toLocaleString('en-IN'),                  label: 'TOTAL ORDERS',   delta: '+11% ↑', up: true, color: 'green' }
    ];

    // Revenue bars
    const sortedByRevenue = [...branchData].sort((a, b) => b.revenueNum - a.revenueNum);
    const maxRev = sortedByRevenue[0]?.revenueNum || 1;
    this.revenueBars = sortedByRevenue.map(b => ({
      label: b.name,
      value: b.revenue,
      pct: Math.round(b.revenueNum / maxRev * 100),
      color: b.color
    }));

    // Donut
    this.donutData = this.buildDonut(branchData.map(b => ({
      label: b.name,
      value: b.revenueNum || 1,
      color: b.color
    })));
    this.donutTotal = totalRevenue >= 1000
      ? '₹' + (totalRevenue / 100000 >= 1 ? (totalRevenue / 100000).toFixed(2) + 'L' : Math.round(totalRevenue / 1000) + 'K')
      : '₹' + totalRevenue;

    // Weekly line chart from all orders
    const buckets = new Array(7).fill(0);
    orders.filter(o => o.status === OrderStatus.SERVED).forEach(o => {
      const d = new Date(o.orderTime).getDay();
      buckets[d === 0 ? 6 : d - 1] += o.totalAmount;
    });
    this.lineData = this.buildLine(buckets.map(v => v || 1), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

    // Insights
    const topBranch = sortedByRevenue[0];
    const worstBranch = sortedByRevenue[sortedByRevenue.length - 1];
    this.insights = [
      { icon: 'emoji_events',  text: topBranch ? `Top area: ${topBranch.name} — ₹${topBranch.revenueNum.toLocaleString('en-IN')}` : 'No data', type: 'up'   },
      { icon: 'table_bar',     text: `${totalTables} tables across ${areaKeys.length} areas`,                                                   type: 'info' },
      { icon: 'groups',        text: `Overall occupancy: ${Math.round(tableStats.occupancyRate)}%`,                                              type: tableStats.occupancyRate >= 70 ? 'up' : 'info' },
      { icon: 'trending_up',   text: `Total revenue: ₹${totalRevenue.toLocaleString('en-IN')}`,                                                 type: 'up'   }
    ];
    this.alerts = [];
    if (worstBranch && worstBranch.revenueNum < maxRevenue * 0.3) {
      this.alerts.push({ icon: 'trending_down', text: `${worstBranch.name} revenue is significantly lower — review operations`, type: 'warn' });
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

  revenueVal(rev: string): number {
    return parseInt(rev.replace(/[₹,]/g, ''), 10) || 0;
  }

  get filteredBranches() {
    let data = [...this.branches];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(b => b.name.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'revenue' ? a.revenueNum - b.revenueNum :
                this.sortCol === 'orders'  ? a.orders - b.orders :
                a.name.localeCompare(b.name);
      return this.sortDir === 'asc' ? v : -v;
    });
    return data;
  }

  get pagedBranches() {
    return this.filteredBranches.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredBranches.length / this.pageSize));
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
    const rows = [['Area', 'Revenue', 'Orders', 'Occupancy', 'Top Item', 'Status']];
    this.branches.forEach(b => rows.push([b.name, b.revenue, String(b.orders), b.occupancy, b.topItem, b.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'branch-report.csv';
    a.click();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
