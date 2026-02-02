import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { TableService } from '../../services/table.service';
import { Table, TableStatus } from '../../models/table.model';
import { TableCardComponent } from '../../components/table-card/table-card.component';

type FilterType = TableStatus | 'ALL';

@Component({
  selector: 'app-table-dashboard',
  standalone: true,
  imports: [CommonModule, TableCardComponent],
  templateUrl: './table-dashboard.component.html',
  styleUrls: ['./table-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableDashboardComponent implements OnInit, OnDestroy {

  // ✅ FIXED: Proper status mapping object
  TableStatusMap = {
    FREE: 'available' as const,
    OPEN: 'occupied' as const,
    HOLD: 'reserved' as const,
    PAID: 'available' as const
  } as const;

  /* ================= DATA ================= */

  tables: Table[] = [];
  filteredTables: Table[] = [];
  filter: FilterType = 'ALL';

  stats = {
    total: 0,
    free: 0,
    open: 0,
    hold: 0,
    paid: 0,
    pending: 0,
    revenue: 0
  };

  private destroy$ = new Subject<void>();
  private statusCounts = new Map<string, number>();

  constructor(
    private tableService: TableService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        // immutable update for OnPush
        this.tables = [...tables];
        this.updateDashboard();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= DASHBOARD UPDATE ================= */

  private updateDashboard(): void {
    this.applyFilter();
    this.calculateStats();
  }

  /* ================= FILTER ================= */

  setFilter(filter: FilterType): void {
    if (this.filter === filter) {
      return;
    }
    this.filter = filter;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private applyFilter(): void {
    const filtered =
      this.filter === 'ALL'
        ? [...this.tables]
        : this.tables.filter(t => t.status === this.filter);

    // ✅ SORT: Occupied tables first, then by table number
    this.filteredTables = this.sortTables(filtered);
  }

  /* ================= SORTING (Occupied First) ================= */

  private sortTables(tables: Table[]): Table[] {
    return tables.sort((a, b) => {
      // ✅ FIXED: Priority order using actual TableStatus values
      const statusOrder: Record<string, number> = {
        'occupied': 1,   // OPEN
        'reserved': 2,   // HOLD
        'available': 3,  // PAID/FREE
        'cleaning': 4
      };

      const aOrder = statusOrder[a.status] || 5;
      const bOrder = statusOrder[b.status] || 5;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // Secondary sort by table number
      return a.id - b.id;
    });
  }

  /* ================= STATS ================= */

  private calculateStats(): void {
    this.statusCounts.clear();

    this.tables.forEach(t => {
      const current = this.statusCounts.get(t.status) || 0;
      this.statusCounts.set(t.status, current + 1);
    });

    // ✅ FIXED: Use actual TableStatus string values
    const free = this.statusCounts.get('available') || 0;      // FREE/PAID
    const open = this.statusCounts.get('occupied') || 0;       // OPEN
    const hold = this.statusCounts.get('reserved') || 0;       // HOLD
    const paid = (this.statusCounts.get('available') || 0) - free; // PAID portion

    const revenue = this.tables.reduce((sum, t) => sum + (t.amount || 0), 0);

    this.stats = {
      total: this.tables.length,
      free,
      open,
      hold,
      paid,
      pending: open + hold,
      revenue
    };
  }

  /* ================= ACTIONS ================= */

  openTable(table: Table): void {
    this.router.navigate(['/pos'], {
      queryParams: { table: table.id }
    });
  }

  // ✅ FIXED: Use actual status value
  resetTableToFree(table: Table): void {
    if (table.status === 'available') { // PAID tables are available
      this.tableService.updateTableStatus(table.id, 'available');
      this.cdr.markForCheck();
    }
  }

  trackById(index: number, table: Table): number {
    return table.id;
  }

  // ✅ HELPER: Expose for template (if needed)
  getStatusCounts() {
    return {
      free: this.statusCounts.get('available') || 0,
      open: this.statusCounts.get('occupied') || 0,
      hold: this.statusCounts.get('reserved') || 0,
      paid: (this.statusCounts.get('available') || 0) - (this.statusCounts.get('available') || 0)
    };
  }
}
