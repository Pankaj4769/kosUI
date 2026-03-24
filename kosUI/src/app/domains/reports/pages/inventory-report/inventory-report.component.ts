import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../dashboard/services/inventory.service';
import { Item } from '../../../dashboard/models/item.model';
import { ReportFilterComponent } from '../../shared/report-filter/report-filter.component';

@Component({
  selector: 'app-inventory-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent],
  templateUrl: './inventory-report.component.html',
  styleUrls: ['./inventory-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'qty';
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;
  pageSize = 5;
  filterConfig = { showBranch: true, showCategory: true };

  stats: any[] = [];
  categoryBars: any[] = [];
  lowStockItems: any[] = [];
  donutData: any[] = [];
  donutTotal = '0';
  lineData: { x: number; y: number; label: string }[] = [];
  linePoints = '';
  lineAreaPath = '';
  insights: any[] = [];
  alerts: any[] = [];

  constructor(private invSvc: InventoryService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.invSvc.getItemlist().pipe(takeUntil(this.destroy$)).subscribe(items => {
      this.invSvc.populateItems(items);
      this.compute(items);
      this.cdr.markForCheck();
    });
  }

  private compute(items: Item[]) {
    const total = items.length;
    const lowStock = items.filter(i => i.qty > 0 && i.qty <= 5).length;
    const outOfStock = items.filter(i => i.qty === 0).length;
    const stockValue = items.reduce((s, i) => s + i.price * i.qty, 0);

    this.stats = [
      { value: total.toString(),                         label: 'TOTAL ITEMS',  delta: '+4 ↑',  up: true,  color: 'blue'  },
      { value: lowStock.toString(),                      label: 'LOW STOCK',    delta: '+3 ↑',  up: false, color: 'red'   },
      { value: outOfStock.toString(),                    label: 'OUT OF STOCK', delta: '-2 ↓',  up: true,  color: 'red'   },
      { value: '₹' + stockValue.toLocaleString('en-IN'), label: 'STOCK VALUE', delta: '+5% ↑', up: true,  color: 'green' }
    ];

    const cats = ['Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Beverages'];
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const catCounts = cats.map(c => items.filter(i => i.category.includes(c)).length);
    const maxCat = Math.max(...catCounts) || 1;
    this.categoryBars = cats.map((c, i) => ({
      label: c,
      value: catCounts[i].toString() + ' items',
      pct: Math.round(catCounts[i] / maxCat * 100),
      color: colors[i]
    }));

    this.donutData = this.buildDonut(cats.map((c, i) => ({ label: c, value: catCounts[i] || 1, color: colors[i] })));
    this.donutTotal = total.toString();

    this.lowStockItems = items
      .filter(i => i.qty <= 10)
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 20)
      .map(i => ({
        name: i.name,
        category: i.category[0] || 'General',
        current: i.qty,
        min: 10,
        status: i.qty === 0 ? 'OUT OF STOCK' : i.qty <= 5 ? 'CRITICAL' : 'LOW'
      }));

    const weeklyVals = [0.88, 0.91, 0.87, 0.93, 0.90, 0.95, 1].map(f => Math.round(stockValue * f));
    this.lineData = this.buildLine(weeklyVals.map(v => v || 1), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

    this.insights = [
      { icon: 'inventory_2',  text: `${total} items across ${cats.filter((_, i) => catCounts[i] > 0).length} categories`, type: 'info' },
      { icon: 'warning',      text: `${lowStock} items below minimum threshold`, type: lowStock > 5 ? 'warn' : 'info' },
      { icon: 'block',        text: `${outOfStock} items out of stock`, type: outOfStock > 0 ? 'alert' : 'up' },
      { icon: 'attach_money', text: `Total stock value: ₹${stockValue.toLocaleString('en-IN')}`, type: 'up' }
    ];
    this.alerts = [];
    if (outOfStock > 0) this.alerts.push({ icon: 'warning', text: `${outOfStock} items are out of stock — immediate reorder needed`, type: 'error' });
    if (lowStock > 3)  this.alerts.push({ icon: 'info',    text: `${lowStock} items are below minimum threshold`, type: 'warn' });
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
    let data = [...this.lowStockItems];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'qty' ? a.current - b.current : a.name.localeCompare(b.name);
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
    const rows = [['Item', 'Category', 'Current Qty', 'Status']];
    this.lowStockItems.forEach(i => rows.push([i.name, i.category, i.current, i.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'inventory-report.csv';
    a.click();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
