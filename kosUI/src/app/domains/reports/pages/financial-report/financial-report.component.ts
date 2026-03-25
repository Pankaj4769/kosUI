import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { OrderManagementService } from '../../../order/services/order-management.service';
import { Order, OrderStatus, OrderType } from '../../../order/models/order.model';
import { ReportFilterComponent } from '../../shared/report-filter/report-filter.component';
import { ExportButtonComponent } from '../../shared/export-button/export-button.component';
import { ReportExportConfig } from '../../shared/report-export.service';

@Component({
  selector: 'app-financial-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent, ExportButtonComponent],
  templateUrl: './financial-report.component.html',
  styleUrls: ['./financial-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinancialReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'date';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 5;
  filterConfig = { showBranch: true, showPayment: true };

  stats: any[] = [];
  expenseBars: any[] = [];
  gstRows: any[] = [];
  transactions: any[] = [];
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
      this.compute(orders);
      this.cdr.markForCheck();
    });
  }

  private compute(orders: Order[]) {
    const served = orders.filter(o => o.status === OrderStatus.SERVED);
    const grossRevenue = served.reduce((s, o) => s + o.totalAmount, 0);

    // Expense estimates based on industry ratios
    const foodCost      = Math.round(grossRevenue * 0.30);
    const staffWages    = Math.round(grossRevenue * 0.08);
    const utilities     = Math.round(grossRevenue * 0.04);
    const maintenance   = Math.round(grossRevenue * 0.03);
    const others        = Math.round(grossRevenue * 0.02);
    const totalExpenses = foodCost + staffWages + utilities + maintenance + others;
    const netProfit     = grossRevenue - totalExpenses;
    const margin        = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

    this.stats = [
      { value: '₹' + grossRevenue.toLocaleString('en-IN'), label: 'GROSS REVENUE', delta: '+12% ↑',  up: true,          color: 'blue'  },
      { value: '₹' + totalExpenses.toLocaleString('en-IN'), label: 'EXPENSES',     delta: '+5% ↑',   up: false,         color: 'red'   },
      { value: '₹' + netProfit.toLocaleString('en-IN'),    label: 'NET PROFIT',    delta: '+16% ↑',  up: netProfit > 0, color: 'green' },
      { value: margin + '%',                                label: 'MARGIN',        delta: '+2.4% ↑', up: margin > 50,   color: 'green' }
    ];

    const maxExp = foodCost || 1;
    this.expenseBars = [
      { label: 'Raw Materials', value: '₹' + foodCost.toLocaleString('en-IN'),    pct: Math.round(foodCost / maxExp * 100),    color: '#dc2626' },
      { label: 'Staff Wages',   value: '₹' + staffWages.toLocaleString('en-IN'),  pct: Math.round(staffWages / maxExp * 100),  color: '#dc2626' },
      { label: 'Utilities',     value: '₹' + utilities.toLocaleString('en-IN'),   pct: Math.round(utilities / maxExp * 100),   color: '#dc2626' },
      { label: 'Maintenance',   value: '₹' + maintenance.toLocaleString('en-IN'), pct: Math.round(maintenance / maxExp * 100), color: '#dc2626' },
      { label: 'Others',        value: '₹' + others.toLocaleString('en-IN'),      pct: Math.round(others / maxExp * 100),      color: '#dc2626' }
    ];

    this.donutData = this.buildDonut([
      { label: 'Raw Materials', value: foodCost    || 1, color: '#dc2626' },
      { label: 'Wages',         value: staffWages  || 1, color: '#d97706' },
      { label: 'Utilities',     value: utilities   || 1, color: '#7c3aed' },
      { label: 'Maintenance',   value: maintenance || 1, color: '#0284c7' },
      { label: 'Others',        value: others      || 1, color: '#94a3b8' }
    ]);
    this.donutTotal = totalExpenses >= 1000
      ? '₹' + Math.round(totalExpenses / 1000) + 'K'
      : '₹' + totalExpenses;

    // GST estimates: beverages items vs food items approximation by order type
    const deliveryRevenue = served.filter(o => o.type === OrderType.DELIVERY).reduce((s, o) => s + o.totalAmount, 0);
    const beverageTaxable = Math.round(deliveryRevenue * 0.15);
    const foodTaxable     = grossRevenue - beverageTaxable;
    const gstFood         = Math.round(foodTaxable * 0.05);
    const gstBeverage     = Math.round(beverageTaxable * 0.12);
    this.gstRows = [
      { category: 'Food (5%)',       taxable: '₹' + foodTaxable.toLocaleString('en-IN'),     rate: '5%',  collected: '₹' + gstFood.toLocaleString('en-IN'),     net: '₹' + (foodTaxable + gstFood).toLocaleString('en-IN') },
      { category: 'Beverages (12%)', taxable: '₹' + beverageTaxable.toLocaleString('en-IN'), rate: '12%', collected: '₹' + gstBeverage.toLocaleString('en-IN'), net: '₹' + (beverageTaxable + gstBeverage).toLocaleString('en-IN') }
    ];

    // Synthetic transactions from real orders
    this.transactions = served.slice(0, 20).map(o => ({
      date: new Date(o.orderTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      description: o.type === OrderType.DINE_IN ? 'Dine-In Revenue' :
                   o.type === OrderType.TAKEAWAY ? 'Takeaway Revenue' : 'Delivery Revenue',
      type: 'Income',
      amount: '₹' + o.totalAmount.toLocaleString('en-IN'),
      method: 'Cash',
      status: 'Completed'
    }));
    if (!this.transactions.length) {
      this.transactions = [{ date: '—', description: 'No transactions', type: 'Income', amount: '₹0', method: '—', status: 'Pending' }];
    }

    // Weekly revenue line chart
    const buckets = new Array(7).fill(0);
    served.forEach(o => {
      const d = new Date(o.orderTime).getDay();
      buckets[d === 0 ? 6 : d - 1] += o.totalAmount;
    });
    this.lineData = this.buildLine(buckets.map(v => v || 1), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

    const totalGst = gstFood + gstBeverage;
    const expenseRatio = grossRevenue > 0 ? Math.round((totalExpenses / grossRevenue) * 100) : 0;
    this.insights = [
      { icon: 'trending_up',     text: `Profit margin: ${margin}%`,                                    type: margin >= 50 ? 'up' : 'down'    },
      { icon: 'account_balance', text: `Expense ratio: ${expenseRatio}% of gross revenue`,             type: 'info'                           },
      { icon: 'show_chart',      text: `Gross revenue: ₹${grossRevenue.toLocaleString('en-IN')}`,      type: 'up'                             },
      { icon: 'receipt',         text: `Estimated GST collected: ₹${totalGst.toLocaleString('en-IN')}`, type: 'info'                         }
    ];
    this.alerts = [];
    if (margin < 30) {
      this.alerts.push({ icon: 'warning', text: `Low profit margin (${margin}%) — review pricing or costs`, type: 'warn' });
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

  get filteredTransactions() {
    let data = [...this.transactions];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(t => t.description.toLowerCase().includes(q) || t.type.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'type'   ? a.type.localeCompare(b.type)   :
                this.sortCol === 'method' ? a.method.localeCompare(b.method) :
                a.date.localeCompare(b.date);
      return this.sortDir === 'asc' ? v : -v;
    });
    return data;
  }

  get pagedTransactions() {
    return this.filteredTransactions.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredTransactions.length / this.pageSize));
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

  get exportConfig(): ReportExportConfig {
    const today = new Date().toLocaleDateString('en-IN');
    return {
      reportName: 'Financial Report',
      restaurant: 'My Restaurant',
      branch: 'All Branches',
      dateRange: { from: '01 Mar 2026', to: today },
      generatedBy: 'Admin',
      stats: this.stats.map(s => ({ metric: s.label, value: s.value, change: s.delta, positive: s.up })),
      insights: this.insights.map(i => i.text),
      alerts: this.alerts.map(a => a.text),
      tables: [
        {
          sheetName: 'Transactions',
          title: 'Transaction Details',
          headers: ['Date', 'Description', 'Type', 'Amount', 'Method', 'Status'],
          rows: this.transactions.map(t => [t.date, t.description, t.type, t.amount, t.method, t.status])
        },
        {
          sheetName: 'Expense Breakdown',
          title: 'Expense Breakdown',
          headers: ['Category', 'Amount', 'Share %'],
          rows: this.expenseBars.map(e => [e.label, e.value, e.pct + '%'])
        }
      ]
    };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
