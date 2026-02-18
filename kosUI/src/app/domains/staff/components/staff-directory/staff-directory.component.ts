import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges, // Added
  SimpleChanges, // Added
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input, // Added
  Output, // Added
  EventEmitter // Added
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

// Services
import { TableService } from '../../../pos/services/table.service';
import { StaffAnalyticsService } from '../../services/staff-analytics.service';
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component';

// Models
import { Table } from '../../../pos/models/table.model';

// --- Interfaces ---

export interface StaffCard {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  roleId?: number;
  load: number;
  efficiency: number;
  revenue: number;
  activeTables: number;
  rank: number;
  status: 'BUSY' | 'NORMAL' | 'IDLE';
  onDutyStatus: 'ON DUTY' | 'OFF DUTY';
  lastActive: Date;
  performance: number;
  score?: number;

  // Enterprise Intelligence
  workloadIndex?: number;
  productivityIndex?: number;
  consistencyScore?: number;
  fatigueScore?: number;
  heatLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  trend?: 'UP' | 'DOWN' | 'STABLE';
  slaRisk?: boolean;
  
  // Additional metrics
  completedOrders?: number;
  avgServiceTime?: number;
  peakHours?: string;
  alertLevel?: 'NONE' | 'WARNING' | 'CRITICAL';
  
  // Historical data
  weeklyPerformance?: number[];
  shiftHistory?: ShiftRecord[];
  awards?: Award[];
  joinDate?: Date;
}

export interface ShiftRecord {
  date: Date;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  performance: number;
}

export interface Award {
  title: string;
  date: Date;
  icon: string;
}

export interface StaffRole {
  id: number;
  name: string;
  description?: string;
}

export interface StaffFormModel {
  id?: string;
  name: string;
  email: string;
  phone: string;
  roleId: number;
  status: 'ACTIVE' | 'INACTIVE';
}

type ViewMode = 'list' | 'grid';
type ActiveTab = 'directory' | 'roster';

@Component({
  selector: 'app-staff-directory', // CHANGED: Must match usage in Shift HTML
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-directory.component.html',
  styleUrls: ['./staff-directory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffDirectoryComponent implements OnInit, OnDestroy, OnChanges {

  // ============= INPUTS (For Reusability) =============
  // If provided by parent (Shift Component), we use these instead of fetching
  @Input() staffCards: StaffCard[] = []; 
  @Input() viewMode: ViewMode = 'list';
  @Input() filterStatus: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE' = 'ALL';
  @Input() loading: boolean = false;
  
  // Flag to know if we are in "child mode" (Shift Screen) or "page mode" (Dashboard)
  @Input() useExternalData: boolean = false;

  // ============= LOCAL STATE =============
  tables: Table[] = [];
  allStaffCards: StaffCard[] = []; // Source of truth for filtering

  kpi = {
    totalStaff: 0,
    onDuty: 0,
    busyStaff: 0,
    idleStaff: 0,
    avgEfficiency: 0,
    totalRevenue: 0,
    avgRevenue: 0,
    totalActiveTables: 0,
    awards: 0
  };

  sortBy: 'rank' | 'revenue' | 'efficiency' | 'load' | 'performance' | 'lastActive' = 'rank';
  activeTab: ActiveTab = 'directory';
  searchTerm: string = '';

  // Modal State
  selectedStaff: StaffCard | null = null;
  showStaffModal: boolean = false;
  showAddStaffModal: boolean = false;
  isEditingStaff: boolean = false;
  newStaff: StaffFormModel = this.getEmptyStaffForm();

  roles: StaffRole[] = [
    { id: 1, name: 'Manager', description: 'Store operations oversight' },
    { id: 2, name: 'Chef', description: 'Kitchen lead' },
    { id: 3, name: 'Waiter', description: 'Customer service & orders' },
    { id: 4, name: 'Cashier', description: 'Payments & billing' }
  ];

  private destroy$ = new Subject<void>();
  private cachedOrders: any[] = [];

  constructor(
    private tableService: TableService,
    private staffService: StaffAnalyticsService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Only subscribe to data if we are NOT using external data (e.g. Dashboard view)
    if (!this.useExternalData) {
      this.subscribeToData();
    } else {
      // If external data is used, initialize view with input
      this.allStaffCards = [...this.staffCards];
      this.applyFilter();
    }
  }

  // Detect changes when parent passes new data
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['staffCards'] && this.useExternalData) {
       this.allStaffCards = [...(this.staffCards || [])];
       this.applyFilter();
       this.buildKpi();
       this.cdr.markForCheck();
    }
    
    if (changes['filterStatus']) {
      this.applyFilter();
    }
    
    if (changes['viewMode']) {
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= DATA LOGIC ================= */

  subscribeToData() {
    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.tables = [...tables];
        this.cachedOrders = this.buildOrders();
        this.buildDashboard();
        this.cdr.markForCheck();
      });

    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.buildDashboard();
        this.cdr.markForCheck();
      });
  }

  buildDashboard() {
    let staffNames = Array.from(new Set(this.tables.map(t => t.waiter).filter(Boolean))) as string[];
    
    if (staffNames.length === 0 && !this.useExternalData) {
       staffNames = ['Alice', 'Bob', 'Charlie', 'David']; 
    }

    const cards: StaffCard[] = staffNames.map((name, index) => {
      const stats = this.staffService.calculate(name, this.tables, this.cachedOrders);
      const activeTables = this.tables.filter(t => t.waiter === name && t.status === 'occupied').length;

      // Metric calculations (Same logic as before)
      const score = Math.round(stats.loadScore * 0.35 + stats.efficiencyScore * 0.45 + Math.min(stats.revenue / 100, 100) * 0.20);
      const workloadIndex = Math.min(Math.round((stats.loadScore + activeTables * 10) / 2), 100);
      const heatLevel: 'LOW' | 'MEDIUM' | 'HIGH' = workloadIndex > 75 ? 'HIGH' : workloadIndex > 40 ? 'MEDIUM' : 'LOW';
      
      return {
        id: `STF-${String(index + 1).padStart(2, '0')}`,
        name,
        role: this.assignRole(name, index),
        load: stats.loadScore,
        efficiency: stats.efficiencyScore,
        revenue: stats.revenue,
        activeTables,
        rank: 0,
        status: stats.loadScore > 75 ? 'BUSY' : 'NORMAL',
        onDutyStatus: activeTables > 0 ? 'ON DUTY' : 'OFF DUTY',
        lastActive: new Date(),
        performance: Math.round((stats.efficiencyScore / 100) * 5 * 10) / 10,
        score,
        workloadIndex,
        heatLevel,
        productivityIndex: Math.min(Math.round((stats.efficiencyScore * 0.6) + (Math.min(stats.revenue / 100, 100) * 0.4)), 100),
        consistencyScore: Math.max(100 - Math.abs(stats.loadScore - stats.efficiencyScore), 10),
        fatigueScore: Math.min(Math.round(workloadIndex * 0.7 + (100 - stats.efficiencyScore) * 0.3), 100),
        trend: stats.efficiencyScore > 70 ? 'UP' : 'STABLE',
        completedOrders: stats.completedOrders,
        avgServiceTime: stats.avgServiceTime,
        alertLevel: workloadIndex > 85 ? 'WARNING' : 'NONE',
        shiftHistory: this.generateShiftHistory(),
        awards: [],
        joinDate: new Date(2023, 0, 1)
      } as StaffCard;
    });

    this.sortCards(cards);
    cards.forEach((c, i) => c.rank = i + 1);
    
    // Update local state AND view
    this.allStaffCards = cards;
    this.applyFilter();
    this.buildKpi();
  }

  /* ================= UI ACTIONS ================= */

  private sortCards(cards: StaffCard[]) {
    switch (this.sortBy) {
      case 'rank': cards.sort((a, b) => (b.score || 0) - (a.score || 0)); break;
      case 'revenue': cards.sort((a, b) => b.revenue - a.revenue); break;
      case 'efficiency': cards.sort((a, b) => b.efficiency - a.efficiency); break;
      case 'load': cards.sort((a, b) => b.load - a.load); break;
      case 'performance': cards.sort((a, b) => b.performance - a.performance); break;
      case 'lastActive': cards.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime()); break;
    }
  }

  applyFilter() {
    let filtered = [...this.allStaffCards];
    
    if (this.filterStatus !== 'ALL') {
      filtered = filtered.filter(s => s.status === this.filterStatus);
    }
    
    if (this.searchTerm.trim()) {
       const term = this.searchTerm.toLowerCase();
       filtered = filtered.filter(s => 
         s.name.toLowerCase().includes(term) || 
         s.role.toLowerCase().includes(term)
       );
    }
    
    // Update the view variable
    this.staffCards = filtered;
    this.cdr.markForCheck();
  }

  setFilter(status: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE') {
    this.filterStatus = status;
    this.applyFilter();
  }
  
  toggleViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }
  
  setActiveTab(tab: ActiveTab) {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  setSorting(field: any) {
    this.sortBy = field;
    if (!this.useExternalData) {
      this.buildDashboard();
    } else {
      this.sortCards(this.allStaffCards);
      this.applyFilter();
    }
  }

  onSearchChange() {
    this.applyFilter();
  }

  /* ================= STAFF ACTIONS & HELPERS ================= */
  // ... (Keep existing methods: viewStaffDetails, openAddStaffModal, saveStaff, deleteStaffMember, etc.) ...
  
  viewStaffDetails(staff: StaffCard) {
    this.selectedStaff = staff;
    this.showStaffModal = true;
    this.cdr.markForCheck();
  }
  
  closeStaffModal() {
    this.showStaffModal = false;
    this.selectedStaff = null;
    this.cdr.markForCheck();
  }

  get isStaffSelected(): boolean {
    return !!this.selectedStaff;
  }

  openAddStaffModal() {
    this.isEditingStaff = false;
    this.newStaff = this.getEmptyStaffForm();
    this.showAddStaffModal = true;
    this.cdr.markForCheck();
  }

  openEditStaffModal(staff: StaffCard) {
    this.closeStaffModal();
    this.isEditingStaff = true;
    this.newStaff = {
      id: staff.id,
      name: staff.name,
      email: staff.email || '',
      phone: staff.phone || '',
      roleId: staff.roleId || 0,
      status: 'ACTIVE'
    };
    this.showAddStaffModal = true;
    this.cdr.markForCheck();
  }

  closeAddStaffModal() {
    this.showAddStaffModal = false;
    this.cdr.markForCheck();
  }

  getAddStaffModalTitle(): string {
    return this.isEditingStaff ? 'Edit Staff Member' : 'Add New Staff';
  }

  getSelectedRoleDescription(): string {
     const r = this.roles.find(x => x.id == this.newStaff.roleId);
     return r ? r.description || '' : '';
  }

  saveStaff() {
    if(!this.newStaff.name) return;
    console.log('Saving staff:', this.newStaff);
    this.closeAddStaffModal();
  }
  
  deleteStaffMember(id: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Delete Staff Member',
        message: 'Are you sure?',
        confirmText: 'Remove',
        confirmColor: 'warn',
        type: 'delete'
      }
    });
    
    dialogRef.afterClosed().subscribe(res => {
      if(res) {
         console.log('Deleting staff:', id);
         this.cdr.markForCheck();
      }
    });
  }
  
  autoGenerateRoster() {
    console.log('Auto-generating roster...');
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#fb923c';
    return '#ef4444';
  }
  
  getPerformanceStars(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) stars.push('★');
    if (hasHalf) stars.push('⯨'); 
    while (stars.length < 5) stars.push('☆');
    return stars;
  }
  
  formatTime(date: Date): string {
    if (!date) return '-';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackByStaffId(_: number, item: StaffCard) {
    return item.id;
  }
  
  private getEmptyStaffForm(): StaffFormModel {
    return { name: '', email: '', phone: '', roleId: 0, status: 'ACTIVE' };
  }

  private buildKpi() {
    this.kpi = {
      totalStaff: this.allStaffCards.length,
      onDuty: this.allStaffCards.filter(s => s.onDutyStatus === 'ON DUTY').length,
      busyStaff: this.allStaffCards.filter(s => s.status === 'BUSY').length,
      idleStaff: this.allStaffCards.filter(s => s.status === 'IDLE').length,
      avgEfficiency: Math.round(this.allStaffCards.reduce((a, b) => a + b.efficiency, 0) / (this.allStaffCards.length || 1)),
      totalRevenue: this.allStaffCards.reduce((a, b) => a + b.revenue, 0),
      avgRevenue: 0, 
      totalActiveTables: this.allStaffCards.reduce((a, b) => a + b.activeTables, 0),
      awards: 0
    };
  }
  
  private buildOrders() {
    return []; 
  }
  
  private assignRole(name: string, index: number) {
    const roles = ['Head Cashier', 'Executive Chef', 'Waitstaff', 'Kitchen Staff', 'Manager'];
    return roles[index % roles.length];
  }
  
  private generateShiftHistory(): ShiftRecord[] {
    return Array.from({ length: 5 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '17:00',
      hoursWorked: 8,
      performance: Math.random() * 2 + 3
    }));
  }
}
