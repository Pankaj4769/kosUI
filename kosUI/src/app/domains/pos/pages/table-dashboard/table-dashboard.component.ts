import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, interval } from 'rxjs'; // ✅ Added 'interval'
import { FormsModule } from '@angular/forms';

import { TableService } from '../../services/table.service';
import { Table, TableStatus, Reservation, AreaType } from '../../models/table.model';
import { TableCardComponent } from '../../components/table-card/table-card.component';

type FilterType = TableStatus | 'ALL';

@Component({
  selector: 'app-table-dashboard',
  standalone: true,
  imports: [CommonModule, TableCardComponent, FormsModule],
  templateUrl: './table-dashboard.component.html',
  styleUrls: ['./table-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableDashboardComponent implements OnInit, OnDestroy {

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

  /* ================= FLOOR PLAN & UI STATE ================= */

  areas: Array<{id: AreaType, label: string}> = [
    { id: 'main-hall', label: 'Main Hall' }
  ];
  selectedArea: AreaType = 'main-hall';

  waitersList: string[] = ['John Doe', 'Sarah Smith', 'Mike Johnson', 'Emma Wilson', 'David Brown'];
  lastAssignedWaiterIndex: number = 0; // ✅ For round-robin assignment

  isEditMode: boolean = false;

  // Modals
  showAddTableModal: boolean = false;
  showAddReservationModal: boolean = false;
  showManageAreasModal: boolean = false;
  showAssignCaptainModal: boolean = false;

  // Modal Data
  selectedCapacity: number = 4;
  newAreaName: string = '';
  tableToAssign: Table | null = null;
  selectedCaptain: string = '';

  newReservation: Partial<Reservation> = {
    guests: 2,
    time: '19:00',
    date: new Date().toISOString().split('T')[0]
  };

  upcomingReservations: Reservation[] = [];
  occupancyPercentage: number = 0;
  dirtyCount: number = 0;

  constructor(
    private tableService: TableService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    // 1. Subscribe to Table Data
    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.tables = [...tables];
        this.updateDashboard();
        this.initAreas();
        this.cdr.markForCheck();
      });

    // 2. Subscribe to Reservations
    this.tableService.getUpcomingReservations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(reservations => {
        this.upcomingReservations = reservations;
        this.cdr.markForCheck();
      });

    // 3. ✅ AUTO PRIORITY CHECKER (Every 1 minute)
    interval(60000) // 60 seconds
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkAutoPriority();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= AUTO PRIORITY LOGIC (NEW) ================= */

  private checkAutoPriority(): void {
    const PRIORITY_THRESHOLD_MINUTES = 15; // Configurable: Mark priority if waiting > 15m

    let hasUpdates = false;
    const now = new Date().getTime();

    this.tables.forEach(table => {
      // Only check occupied tables that are NOT yet priority
      if (table.status === 'occupied' && !table.isPriority && table.startTime) {
        const startTime = new Date(table.startTime).getTime();
        const elapsedMinutes = (now - startTime) / 60000;

        if (elapsedMinutes > PRIORITY_THRESHOLD_MINUTES) {
          table.isPriority = true; // Flag as priority
          hasUpdates = true;
          // Optional: You could play a sound here or show a toast
          console.log(`Auto-Priority enabled for Table ${table.id} (Waiting ${Math.floor(elapsedMinutes)}m)`);
        }
      }
    });

    if (hasUpdates) {
      this.updateDashboard(); // Re-sort tables so priority ones jump to top
      this.cdr.markForCheck();
    }
  }

  /* ================= AUTO ASSIGNMENT LOGIC (NEW) ================= */

  private getAutoAssignedWaiter(): string {
    if (this.waitersList.length === 0) return 'Staff';
    
    // Round-robin assignment logic
    const waiter = this.waitersList[this.lastAssignedWaiterIndex];
    this.lastAssignedWaiterIndex = (this.lastAssignedWaiterIndex + 1) % this.waitersList.length;
    
    return waiter;
  }

  /* ================= DASHBOARD UPDATE ================= */

  private updateDashboard(): void {
    this.applyFilter();
    this.calculateStats();
    this.calculateOccupancy();
    this.calculateDirtyCount();
  }

  /* ================= FILTER & SORTING ================= */

  setFilter(filter: FilterType): void {
    if (this.filter === filter) return;
    this.filter = filter;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private applyFilter(): void {
    let filtered = this.filter === 'ALL'
      ? [...this.tables]
      : this.tables.filter(t => t.status === this.filter);

    filtered = this.filterByArea(filtered);
    this.filteredTables = this.sortTables(filtered);
  }

  private sortTables(tables: Table[]): Table[] {
    return tables.sort((a, b) => {
      // Priority 1: High Priority tables first
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;

      // Priority 2: Status
      const statusOrder: Record<string, number> = {
        'occupied': 1, 'reserved': 2, 'available': 3, 'cleaning': 4
      };
      const aOrder = statusOrder[a.status] || 5;
      const bOrder = statusOrder[b.status] || 5;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Priority 3: ID
      return a.id - b.id;
    });
  }

  togglePriority(table: Table, event?: Event): void {
    event?.stopPropagation();
    const target = table as any;
    target.isPriority = !target.isPriority;
    this.updateDashboard(); 
    this.cdr.markForCheck();
  }

  /* ================= STATS CALCULATION ================= */

  private calculateStats(): void {
    this.statusCounts.clear();
    this.tables.forEach(t => {
      const current = this.statusCounts.get(t.status) || 0;
      this.statusCounts.set(t.status, current + 1);
    });

    const free = this.statusCounts.get('available') || 0;
    const open = this.statusCounts.get('occupied') || 0;
    const hold = this.statusCounts.get('reserved') || 0;
    const paid = (this.statusCounts.get('available') || 0) - free;
    const revenue = this.tables.reduce((sum, t) => sum + (t.amount || 0), 0);

    this.stats = {
      total: this.tables.length,
      free, open, hold, paid,
      pending: open + hold,
      revenue
    };
  }

  private calculateOccupancy(): void {
    if (this.stats.total === 0) {
      this.occupancyPercentage = 0;
      return;
    }
    const occupied = this.stats.open + this.stats.hold;
    this.occupancyPercentage = Math.round((occupied / this.stats.total) * 100);
  }

  private calculateDirtyCount(): void {
    this.dirtyCount = this.tables.filter(t => t.status === 'cleaning').length;
  }

  getOccupancyColor(): string {
    if (this.occupancyPercentage < 50) return '#22c55e';
    if (this.occupancyPercentage < 80) return '#f59e0b';
    return '#ef4444';
  }

  /* ================= FLOOR PLAN / AREA MANAGEMENT ================= */

  private initAreas() {
    const uniqueAreas = new Set(this.tables.map(t => t.area || 'main-hall'));
    const currentAreaIds = new Set(this.areas.map(a => a.id));

    uniqueAreas.forEach(areaId => {
      if (!currentAreaIds.has(areaId)) {
        this.areas.push({ 
          id: areaId, 
          label: areaId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        });
      }
    });
  }

  selectArea(area: AreaType): void {
    if (this.selectedArea === area) return;
    this.selectedArea = area;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private filterByArea(tables: Table[]): Table[] {
    return tables.filter(t => {
      if ((t as any).area) return (t as any).area === this.selectedArea;
      return this.selectedArea === 'main-hall';
    });
  }

  openManageAreasModal(): void {
    this.showManageAreasModal = true;
    this.cdr.markForCheck();
  }

  closeManageAreasModal(): void {
    this.showManageAreasModal = false;
    this.newAreaName = '';
    this.cdr.markForCheck();
  }

  addArea(): void {
    if (!this.newAreaName.trim()) return;
    const id = this.newAreaName.toLowerCase().replace(/ /g, '-') as AreaType;
    if (!this.areas.some(a => a.id === id)) {
      this.areas.push({ id, label: this.newAreaName });
    }
    this.newAreaName = '';
    this.cdr.markForCheck();
  }

  removeArea(areaId: AreaType): void {
    if (areaId === 'main-hall') {
      alert("Main Hall cannot be removed.");
      return;
    }
    const tablesInArea = this.tables.filter(t => t.area === areaId);
    if (tablesInArea.length > 0) {
      alert(`Cannot remove "${areaId}" because it contains ${tablesInArea.length} tables. Move or remove tables first.`);
      return;
    }
    if (confirm(`Are you sure you want to remove this floor plan?`)) {
      this.areas = this.areas.filter(a => a.id !== areaId);
      if (this.selectedArea === areaId) {
        this.selectArea('main-hall');
      }
      this.cdr.markForCheck();
    }
  }

  /* ================= LAYOUT EDIT MODE ================= */

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    this.cdr.markForCheck();
  }

  /* ================= CAPTAIN ASSIGNMENT ================= */

  openAssignCaptainModal(table: Table, event?: Event): void {
    event?.stopPropagation();
    this.tableToAssign = table;
    this.selectedCaptain = table.waiter || '';
    this.showAssignCaptainModal = true;
    this.cdr.markForCheck();
  }

  closeAssignCaptainModal(): void {
    this.showAssignCaptainModal = false;
    this.tableToAssign = null;
    this.selectedCaptain = '';
    this.cdr.markForCheck();
  }

  confirmAssignCaptain(): void {
    if (this.tableToAssign && this.selectedCaptain) {
      this.tableService.occupyTable(
        this.tableToAssign.id, 
        this.tableToAssign.currentOrder || `ORD-${Date.now()}`, 
        this.selectedCaptain
      );
      this.closeAssignCaptainModal();
    }
  }

  /* ================= RESERVATION MANAGEMENT ================= */

  openAddReservationModal(): void {
    this.showAddReservationModal = true;
    this.newReservation = {
      guests: 2,
      time: '19:00',
      date: new Date().toISOString().split('T')[0]
    };
    this.cdr.markForCheck();
  }

  closeAddReservationModal(): void {
    this.showAddReservationModal = false;
    this.cdr.markForCheck();
  }

  confirmAddReservation(): void {
    if (!this.newReservation.customerName) return;
    const tableId = this.tables.find(t => t.status === 'available' && t.capacity >= (this.newReservation.guests || 2))?.id || 1;
    this.tableService.addReservation({
      ...this.newReservation,
      tableId: tableId,
      tableNumber: tableId,
      status: 'confirmed'
    } as any);
    this.closeAddReservationModal();
  }

  markReservationArrived(reservation: Reservation): void {
    this.tableService.markReservationArrived(reservation.id);
  }

  /* ================= TABLE ACTIONS ================= */

  openTable(table: Table): void {
    this.router.navigate(['/pos'], { queryParams: { table: table.id } });
  }

  startOrder(table: Table, event?: Event): void {
    event?.stopPropagation();
    
    // ✅ AUTO ASSIGN STAFF IF NONE SELECTED
    const assignedStaff = table.waiter || this.getAutoAssignedWaiter();

    this.tableService.occupyTable(table.id, `ORD-${Date.now()}`, assignedStaff);
    this.openTable(table);
  }

  editTable(table: Table, event?: Event): void {
    event?.stopPropagation();
    this.openTable(table);
  }

  checkoutTable(table: Table, event?: Event): void {
    event?.stopPropagation();
    this.router.navigate(['/checkout'], { queryParams: { table: table.id } });
  }

  markTableClean(table: Table, event?: Event): void {
    event?.stopPropagation();
    this.tableService.updateTableStatus(table.id, 'available');
  }

  removeTable(tableId: number, event?: Event): void {
    event?.stopPropagation();
    if (!this.isEditMode) return;
    if (confirm('Remove this table?')) {
      this.tableService.removeTable(tableId);
    }
  }

  /* ================= ADD TABLE MODAL ================= */

  openAddTableModal(): void {
    this.showAddTableModal = true;
    this.selectedCapacity = 4;
    this.cdr.markForCheck();
  }

  closeAddTableModal(): void {
    this.showAddTableModal = false;
    this.cdr.markForCheck();
  }

  setCapacity(cap: number): void {
    this.selectedCapacity = cap;
  }

  confirmAddTable(): void {
    this.tableService.addTable({
      capacity: this.selectedCapacity,
      area: this.selectedArea,
      status: 'available'
    } as any);
    this.closeAddTableModal();
  }

  /* ================= UTILITIES ================= */

  trackById(index: number, table: Table): number {
    return table.id;
  }

  trackReservationById(index: number, res: Reservation): number {
    return res.id;
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }

  getTimeElapsed(startTime?: Date | string): string {
    if (!startTime) return '';
    const now = new Date();
    const start = new Date(startTime);
    if (isNaN(start.getTime())) return '';
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
}
