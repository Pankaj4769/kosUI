import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import { TableService } from '../../services/table.service';
import { Table, TableStatus } from '../../models/table.model';
import { TableCardComponent } from '../table-card/table-card.component';

@Component({
  selector: 'app-table-map',
  standalone: true,
  imports: [
    CommonModule, 
    TableCardComponent,
    MatIconModule,
    MatButtonModule,
    MatDividerModule
  ],
  templateUrl: './table-map.component.html',
  styleUrls: ['./table-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableMapComponent implements OnInit, OnDestroy {

  tables: Table[] = [];
  loading = true;

  // ✅ NEW: Pop-up state
  selectedTableForDetails: Table | null = null;
  showTableDetailsPopup = false;

  private destroy$ = new Subject<void>();

  constructor(
    private tableService: TableService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.tables = tables;
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= ACTIONS ================= */

  openTable(table: Table): void {
    if (table.status === 'cleaning') {
      alert('This table is currently being cleaned.');
      return;
    }

    this.router.navigate(['/pos'], {
      queryParams: { table: table.id }
    });
  }

  /* ================= NEW: TABLE DETAILS POP-UP ================= */

  openTableDetails(table: Table, event: Event): void {
    event.stopPropagation(); // Prevent card click
    this.selectedTableForDetails = table;
    this.showTableDetailsPopup = true;
    this.cdr.markForCheck();
  }

  closeTableDetails(): void {
    this.selectedTableForDetails = null;
    this.showTableDetailsPopup = false;
    this.cdr.markForCheck();
  }

  onSelectTableFromPopup(table: Table): void {
    this.closeTableDetails();
    this.openTable(table);
  }

  onCloseTable(tableId: number): void {
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return;

    const confirm = window.confirm(`Close Table ${table.number} and clear order?`);
    if (confirm) {
      // Call service to release table
      this.tableService.releaseTable(tableId);
      this.closeTableDetails();
    }
  }

  onTransferTable(tableId: number): void {
    alert('Transfer table feature coming soon');
  }

  /* ================= POS HELPERS ================= */

  getStatusClass(table: Table): string {
    const statusClasses: Record<TableStatus, string> = {
      'available': 'table-free',
      'occupied': 'table-open',
      'reserved': 'table-hold',
      'cleaning': 'table-cleaning'
    };

    return statusClasses[table.status] || '';
  }

  isBillingPending(table: Table): boolean {
    return table.status === 'occupied' || table.status === 'reserved';
  }

  getWaiterName(table: Table): string {
    return table.waiter || 'Unassigned';
  }

  /* ================= PERFORMANCE ================= */

  trackById(index: number, table: Table): number {
    return table.id;
  }

  /* ================= POS INTELLIGENCE (OPTIONAL) ================= */

  isOverdue(table: Table): boolean {
    if (!table.timeOccupied) return false;

    const diff = Date.now() - new Date(table.timeOccupied).getTime();
    return diff > 30 * 60 * 1000; // ⏱ 30 minutes
  }

  /* ================= ADDITIONAL HELPERS ================= */

  getStatusColor(status: TableStatus): string {
    const colors: Record<TableStatus, string> = {
      'available': '#4caf50',
      'occupied': '#f44336',
      'reserved': '#ff9800',
      'cleaning': '#9e9e9e'
    };

    return colors[status] || '#6b7280';
  }

  getStatusIcon(status: TableStatus): string {
    const icons: Record<TableStatus, string> = {
      'available': 'check_circle',
      'occupied': 'restaurant',
      'reserved': 'event',
      'cleaning': 'cleaning_services'
    };

    return icons[status] || 'help';
  }

  isActive(table: Table): boolean {
    return table.status === 'occupied' || table.status === 'reserved';
  }

  getElapsedTime(table: Table): string {
    if (!table.timeOccupied) return '';
    
    const diff = Date.now() - new Date(table.timeOccupied).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
  }

  getFormattedTime(date: Date | undefined): string {
    if (!date) return '';
    
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  isLongWait(table: Table): boolean {
    if (!table.timeOccupied) return false;
    
    const diff = Date.now() - new Date(table.timeOccupied).getTime();
    const minutes = Math.floor(diff / 60000);
    
    return minutes >= 30;
  }
}
