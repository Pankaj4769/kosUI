import {
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, interval, combineLatest } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

// Services
import { TableService } from '../../../pos/services/table.service';
import { StaffAnalyticsService } from '../../services/staff-analytics.service';
import { StaffService, StaffMember } from '../../services/staff.service';
import { DepartmentService, Department } from '../../services/department.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { PayrollService } from '../../services/payroll.service';
import { LeaveService } from '../../services/leave.service';
import { ShiftService } from '../../services/shift.service';
import { AttendanceService } from '../../services/attendance.service';
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component';

// Models
import { Table } from '../../../pos/models/table.model';
import { LeaveRequest } from '../../models/leave.model';
import { SalarySlip, CommissionRecord } from '../../models/payroll.model';

// Child components
import {
  PayrollComponent,
  StaffProfile,
  ShiftRecord as PayrollShiftRecord,
  LeaveRecord as PayrollLeaveRecord,
  CommissionRecordView,
  SalarySlipView,
  SalaryKpi,
  CommissionKpi
} from '../payroll/payroll.component';
import {
  ShiftManagementComponent,
  ShiftTemplateView,
  ShiftAssignmentView,
  ShiftKpi,
  SimpleStaff
} from '../shift-management/shift-management.component';

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

  workloadIndex?: number;
  productivityIndex?: number;
  consistencyScore?: number;
  fatigueScore?: number;
  heatLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  trend?: 'UP' | 'DOWN' | 'STABLE';
  slaRisk?: boolean;

  completedOrders?: number;
  avgServiceTime?: number;
  peakHours?: string;
  alertLevel?: 'NONE' | 'WARNING' | 'CRITICAL';

  weeklyPerformance?: number[];
  shiftHistory?: ShiftRecord[];
  awards?: Award[];
  joinDate?: Date;
  departmentName?: string;
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  salary?: number;
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

export interface StaffFormModel {
  id?: string;
  // Step 1
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  // Step 2
  departmentId: number;
  salary: number | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  hireDate: string;
  // Read-only (shown in edit)
  createdAt?: string;
  updatedAt?: string;
}

type ViewMode = 'list' | 'grid';
type ActiveTab = 'directory' | 'shift' | 'payroll';

@Component({
  selector: 'app-staff-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, ShiftManagementComponent, PayrollComponent],
  templateUrl: './staff-directory.component.html',
  styleUrls: ['./staff-directory.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffDirectoryComponent implements OnInit, OnDestroy, OnChanges {

  @Input() staffCards: StaffCard[] = [];
  @Input() viewMode: ViewMode = 'list';
  @Input() filterStatus: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE' = 'ALL';
  @Input() loading: boolean = false;
  @Input() useExternalData: boolean = false;

  tables: Table[] = [];
  allStaffCards: StaffCard[] = [];
  staffMembers: StaffMember[] = [];
  departments: Department[] = [];

  readonly predefinedPositions: string[] = [
    'Owner',
    'Manager',
    'Cashier',
    'Billing',
    'Chef',
    'Waiter'
  ];

  // Fallback departments shown when API returns none, or merged for unmatched names
  private readonly predefinedDepts = [
    { id: -1, name: 'Kitchen Department' },
    { id: -2, name: 'Service Department' },
    { id: -3, name: 'Billing / POS Department' },
    { id: -4, name: 'Management Department' },
    { id: -5, name: 'Ownership Department' }
  ];

  /** API departments + any predefined ones not already present (by name) */
  get availableDepartments(): { id: number; name: string }[] {
    const apiNames = new Set(this.departments.map(d => d.name.toLowerCase()));
    const extras = this.predefinedDepts.filter(p => !apiNames.has(p.name.toLowerCase()));
    return [...this.departments, ...extras];
  }

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

  // Modal state
  selectedStaff: StaffCard | null = null;
  showStaffModal: boolean = false;
  showAddStaffModal: boolean = false;
  isEditingStaff: boolean = false;
  isSaving: boolean = false;
  formStep: 1 | 2 = 1;
  step1Error: string = '';
  resendingId: string | null = null;
  resendMsg: string = '';
  private kosStaffIdFromStep1: number | null = null;

  newStaff: StaffFormModel = this.getEmptyStaffForm();

  // ============= SHIFT STATE =============
  shiftTemplates: ShiftTemplateView[] = [];
  shiftAssignments: ShiftAssignmentView[] = [];
  shiftKpi!: ShiftKpi;
  shiftSelectedDate: Date = new Date();
  shiftAvailableStaff: SimpleStaff[] = [];

  // ============= PAYROLL STATE =============
  payrollStaffDirectory: StaffProfile[] = [];
  payrollShiftRecords: PayrollShiftRecord[] = [];
  payrollLeaveRecords: PayrollLeaveRecord[] = [];
  payrollCommissionRecords: CommissionRecordView[] = [];
  payrollSalarySlips: SalarySlipView[] = [];
  payrollSalaryKpi!: SalaryKpi;
  payrollCommissionKpi!: CommissionKpi;
  payrollSelectedMonth: string = new Date().toISOString().slice(0, 7);
  payrollSelectedStaffId: string = '';
  payrollCalculator = { salesAmount: 0, rate: 0, commission: 0 };
  payrollLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private tableService: TableService,
    private analyticsService: StaffAnalyticsService,
    private staffSvc: StaffService,
    private departmentSvc: DepartmentService,
    private authSvc: AuthService,
    private payrollSvc: PayrollService,
    private leaveSvc: LeaveService,
    private shiftSvc: ShiftService,
    private attendanceSvc: AttendanceService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.departmentSvc.departments$
      .pipe(takeUntil(this.destroy$))
      .subscribe(depts => {
        this.departments = depts;
        this.cdr.markForCheck();
      });

    if (!this.useExternalData) {
      const restaurantId = this.authSvc.currentUser?.restaurantId ?? '';
      this.staffSvc.loadStaff(restaurantId);
      this.subscribeToData();
    } else {
      this.allStaffCards = [...this.staffCards];
      this.applyFilter();
    }
  }

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

  // emId → today's attendance status (PRESENT / LATE = on duty)
  private todayAttendanceMap = new Map<string, string>();

  subscribeToData(): void {
    combineLatest([
      this.staffSvc.staff$,
      this.tableService.tables$,
      this.attendanceSvc.getAttendanceForDate(new Date())
    ]).pipe(takeUntil(this.destroy$))
      .subscribe(([members, tables, attendance]) => {
        this.staffMembers = members;
        this.tables = [...tables];
        this.todayAttendanceMap = new Map(
          attendance.map(a => [a.staffId, a.status])
        );
        const cards = members.map(m => this.toStaffCard(m, tables));
        this.sortCards(cards);
        cards.forEach((c, i) => c.rank = i + 1);
        this.allStaffCards = cards;
        this.applyFilter();
        this.buildKpi();
        this.cdr.markForCheck();
      });

    // Refresh analytics overlay every 10 seconds (no API call — attendance loaded once at startup)
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const cards = this.staffMembers.map(m => this.toStaffCard(m, this.tables));
        this.sortCards(cards);
        cards.forEach((c, i) => c.rank = i + 1);
        this.allStaffCards = cards;
        this.applyFilter();
        this.buildKpi();
        this.cdr.markForCheck();
      });
  }

  private toStaffCard(member: StaffMember, tables: Table[]): StaffCard {
    const stats = this.analyticsService.calculate(member.name, tables, []);
    const activeTables = tables.filter(t => t.waiter === member.name && t.status === 'occupied').length;
    const score = Math.round(stats.loadScore * 0.35 + stats.efficiencyScore * 0.45 + Math.min(stats.revenue / 100, 100) * 0.20);
    const workloadIndex = Math.min(Math.round((stats.loadScore + activeTables * 10) / 2), 100);
    const heatLevel: 'LOW' | 'MEDIUM' | 'HIGH' = workloadIndex > 75 ? 'HIGH' : workloadIndex > 40 ? 'MEDIUM' : 'LOW';

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.position || member.roleName || '',
      roleId: member.departmentId,
      load: stats.loadScore,
      efficiency: stats.efficiencyScore,
      revenue: stats.revenue,
      activeTables,
      rank: 0,
      status: stats.loadScore > 75 ? 'BUSY' : activeTables > 0 ? 'NORMAL' : 'IDLE',
      onDutyStatus: (activeTables > 0 || ['PRESENT','LATE'].includes(this.todayAttendanceMap.get(member.emId ?? '') ?? '')) ? 'ON DUTY' : 'OFF DUTY',
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
      joinDate: member.joinDate,
      departmentName: member.departmentName,
      employmentStatus: member.status as any,
      salary: member.salary,
      shiftHistory: [],
      awards: []
    };
  }

  /* ================= UI ACTIONS ================= */

  private sortCards(cards: StaffCard[]): void {
    switch (this.sortBy) {
      case 'rank': cards.sort((a, b) => (b.score || 0) - (a.score || 0)); break;
      case 'revenue': cards.sort((a, b) => b.revenue - a.revenue); break;
      case 'efficiency': cards.sort((a, b) => b.efficiency - a.efficiency); break;
      case 'load': cards.sort((a, b) => b.load - a.load); break;
      case 'performance': cards.sort((a, b) => b.performance - a.performance); break;
      case 'lastActive': cards.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime()); break;
    }
  }

  applyFilter(): void {
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

    this.staffCards = filtered;
    this.cdr.markForCheck();
  }

  setFilter(status: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE'): void {
    this.filterStatus = status;
    this.applyFilter();
  }

  toggleViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  setActiveTab(tab: ActiveTab): void {
    this.activeTab = tab;
    if (tab === 'shift') this.loadShiftData();
    if (tab === 'payroll') this.loadPayrollData();
    this.cdr.markForCheck();
  }

  setSorting(field: any): void {
    this.sortBy = field;
    if (!this.useExternalData) {
      const cards = this.staffMembers.map(m => this.toStaffCard(m, this.tables));
      this.sortCards(cards);
      cards.forEach((c, i) => c.rank = i + 1);
      this.allStaffCards = cards;
      this.applyFilter();
    } else {
      this.sortCards(this.allStaffCards);
      this.applyFilter();
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  /* ================= STAFF ACTIONS ================= */

  viewStaffDetails(staff: StaffCard): void {
    this.selectedStaff = staff;
    this.showStaffModal = true;
    this.cdr.markForCheck();
  }

  closeStaffModal(): void {
    this.showStaffModal = false;
    this.selectedStaff = null;
    this.cdr.markForCheck();
  }

  get isStaffSelected(): boolean {
    return !!this.selectedStaff;
  }

  openAddStaffModal(): void {
    this.isEditingStaff = false;
    this.formStep = 1;
    this.step1Error = '';
    this.kosStaffIdFromStep1 = null;
    this.newStaff = this.getEmptyStaffForm();
    this.showAddStaffModal = true;
    this.cdr.markForCheck();
  }

  openEditStaffModal(staff: StaffCard): void {
    this.closeStaffModal();
    this.isEditingStaff = true;
    this.formStep = 1;
    this.step1Error = '';
    const member = this.staffMembers.find(m => m.id === staff.id);
    const nameParts = staff.name.split(' ');
    this.newStaff = {
      id: staff.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || member?.name?.split(' ').slice(1).join(' ') || '',
      email: staff.email || '',
      phone: staff.phone || '',
      position: member?.position || staff.role || '',
      departmentId: member?.departmentId || 0,
      salary: member?.salary ?? null,
      status: (member?.status || 'ACTIVE') as StaffFormModel['status'],
      hireDate: member?.joinDate ? new Date(member.joinDate).toISOString().split('T')[0] : '',
      createdAt: member?.createdAt,
      updatedAt: member?.updatedAt
    };
    this.showAddStaffModal = true;
    this.cdr.markForCheck();
  }

  closeAddStaffModal(): void {
    this.showAddStaffModal = false;
    this.isSaving = false;
    this.cdr.markForCheck();
  }

  getAddStaffModalTitle(): string {
    return this.isEditingStaff ? 'Edit Staff Member' : 'Add New Staff';
  }

  /* ================= STEP NAVIGATION ================= */

  goToStep2(): void {
    this.step1Error = '';
    if (!this.newStaff.firstName.trim()) { this.step1Error = 'First name is required.'; return; }
    if (!this.newStaff.email.trim())     { this.step1Error = 'Email address is required.'; return; }
    if (!this.newStaff.position.trim())  { this.step1Error = 'Role / Position is required.'; return; }

    // Editing: no credentials needed — go straight to step 2
    if (this.isEditingStaff) {
      this.formStep = 2;
      this.cdr.markForCheck();
      return;
    }

    if (!this.newStaff.phone.trim()) { this.step1Error = 'Phone number is required (used as username).'; return; }

    // Save Step 1 → KOS auth_user (mobile = username, temp password auto-generated by backend)
    this.isSaving = true;
    this.cdr.markForCheck();

    const restaurantId = this.authSvc.currentUser?.restaurantId ?? '';
    const fullName = [this.newStaff.firstName.trim(), this.newStaff.lastName.trim()].filter(Boolean).join(' ');

    this.staffSvc.addStaffToKos({
      name: fullName,
      email: this.newStaff.email.trim(),
      mobile: this.newStaff.phone.trim(),
      role: this.mapToKosRole(this.newStaff.position),
      restaurantId
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.kosStaffIdFromStep1 = res.staffId;
        this.isSaving = false;
        this.formStep = 2;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.step1Error = err?.error?.message || 'Failed to create staff account. Mobile number may already exist.';
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  goToStep1(): void {
    this.formStep = 1;
    this.cdr.markForCheck();
  }

  /* ================= SAVE / DELETE ================= */

  saveStaff(): void {
    if (this.isSaving) return;
    this.isSaving = true;

    const deptIdNum = Number(this.newStaff.departmentId);
    const realDeptId = deptIdNum > 0 ? deptIdNum : undefined;
    const deptName = this.availableDepartments.find(d => d.id === deptIdNum)?.name;
    const fullName = [this.newStaff.firstName.trim(), this.newStaff.lastName.trim()].filter(Boolean).join(' ');

    if (this.isEditingStaff && this.newStaff.id) {
      // Edit: update employment details in EM using emId
      const member = this.staffMembers.find(m => m.id === this.newStaff.id);
      const emId = member?.emId;
      if (!emId) {
        // No EM record yet — nothing to update on EM side
        this.isSaving = false;
        this.closeAddStaffModal();
        return;
      }
      const editData: Partial<StaffMember> = {
        position: this.newStaff.position.trim(),
        departmentId: realDeptId,
        departmentName: deptName,
        salary: this.newStaff.salary ?? undefined,
        status: this.newStaff.status,
        joinDate: this.newStaff.hireDate ? new Date(this.newStaff.hireDate) : new Date()
      };
      this.staffSvc.updateStaff(emId, editData)
        .pipe(takeUntil(this.destroy$)).subscribe({
          next: () => { this.isSaving = false; this.closeAddStaffModal(); },
          error: (err) => { console.error('Error updating staff:', err); this.isSaving = false; this.cdr.markForCheck(); }
        });
    } else {
      // Add: create employment record in EM — staffId becomes the EM employee id
      const addData: Omit<StaffMember, 'id'> & { staffId: number } = {
        staffId: this.kosStaffIdFromStep1!,
        name: fullName,
        email: this.newStaff.email.trim(),
        phone: this.newStaff.phone.trim(),
        position: this.newStaff.position.trim(),
        roleName: this.newStaff.position.trim(),
        roleId: realDeptId || 0,
        departmentId: realDeptId,
        departmentName: deptName,
        salary: this.newStaff.salary ?? undefined,
        status: this.newStaff.status,
        joinDate: this.newStaff.hireDate ? new Date(this.newStaff.hireDate) : new Date()
      };
      this.staffSvc.addStaff(addData).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.isSaving = false; this.closeAddStaffModal(); },
        error: (err) => {
          console.error('Error creating employee:', err);
          this.isSaving = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  /* ================= ROLE MAPPING ================= */

  private mapToKosRole(position: string): string {
    const map: Record<string, string> = {
      'Owner': 'OWNER', 'Manager': 'MANAGER', 'Cashier': 'CASHIER',
      'Billing': 'BILLING_ASSISTANT', 'Chef': 'CHEF', 'Waiter': 'WAITER'
    };
    return map[position] || 'WAITER';
  }

  deleteStaffMember(staffId: string): void {
    const member = this.staffMembers.find(m => m.id === staffId);
    const emId = member?.emId;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Delete Staff Member',
        message: 'Are you sure you want to remove this staff member? This action cannot be undone.',
        confirmText: 'Remove',
        confirmColor: 'warn',
        type: 'delete'
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
      if (confirmed && emId) {
        this.staffSvc.deleteStaff(emId).pipe(takeUntil(this.destroy$)).subscribe({
          error: (err) => console.error('Error deleting staff:', err)
        });
      }
    });
  }

  resendTempPassword(staff: StaffCard): void {
    // KOS username = mobile number (phone)
    const member = this.staffMembers.find(m => m.id === staff.id);
    const username = member?.phone || staff.phone || '';
    if (!username) {
      this.resendMsg = 'No phone number on record for this staff member.';
      this.cdr.markForCheck();
      return;
    }
    this.resendingId = staff.id;
    this.resendMsg = '';
    this.cdr.markForCheck();
    this.staffSvc.resendTempPassword(username)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.resendingId = null;
          this.resendMsg = res.status ? 'Temporary password sent to staff email.' : 'Failed to send password.';
          this.cdr.markForCheck();
          setTimeout(() => { this.resendMsg = ''; this.cdr.markForCheck(); }, 4000);
        },
        error: () => {
          this.resendingId = null;
          this.resendMsg = 'Failed to resend password. Please try again.';
          this.cdr.markForCheck();
          setTimeout(() => { this.resendMsg = ''; this.cdr.markForCheck(); }, 4000);
        }
      });
  }

  autoGenerateRoster(): void {
    console.log('Auto-generating roster...');
  }

  // ============= SHIFT DATA =============

  loadShiftData(): void {
    this.shiftTemplates = this.shiftSvc.templates;
    this.shiftAssignments = this.shiftSvc.assignments;
    this.shiftKpi = this.shiftSvc.computeKpi();
    this.shiftAvailableStaff = this.staffMembers.map(m => ({
      id: m.id,
      name: m.name,
      role: m.position || m.roleName || '',
      status: m.status
    }));
    this.cdr.markForCheck();
  }

  onShiftDateChange(date: Date): void {
    this.shiftSelectedDate = date;
  }

  onBulkAssign(assignments: ShiftAssignmentView[]): void {
    this.shiftSvc.addAssignments(assignments);
    this.shiftAssignments = this.shiftSvc.assignments;
    this.shiftKpi = this.shiftSvc.computeKpi();
    this.cdr.markForCheck();
  }

  onDeleteAssignment(id: string): void {
    this.shiftSvc.deleteAssignment(id);
    this.shiftAssignments = this.shiftSvc.assignments;
    this.shiftKpi = this.shiftSvc.computeKpi();
    this.cdr.markForCheck();
  }

  // ============= PAYROLL DATA =============

  loadPayrollData(): void {
    if (this.payrollLoading) return;
    this.payrollLoading = true;

    this.payrollStaffDirectory = this.staffMembers.map(m => ({
      id: m.id,
      name: m.name,
      role: m.position || m.roleName || '',
      baseSalary: m.salary || 0,
      email: m.email
    }));

    // Map shift assignments for the selected month to payroll shift records
    this.payrollShiftRecords = this.shiftSvc.assignments
      .filter(a => new Date(a.date).toISOString().slice(0, 7) === this.payrollSelectedMonth)
      .map(a => ({
        staffId: a.staffId,
        date: new Date(a.date).toISOString().split('T')[0],
        shiftType: a.shiftName,
        isPresent: true
      }));

    combineLatest([
      this.payrollSvc.getSalarySlips(this.payrollSelectedMonth),
      this.payrollSvc.getCommissionRecords(this.payrollSelectedMonth),
      this.leaveSvc.getLeaveRequests()
    ]).pipe(takeUntil(this.destroy$)).subscribe(([slips, commissions, leaves]) => {
      this.payrollSalarySlips = slips.map(s => this.toSalarySlipView(s));
      this.payrollCommissionRecords = commissions as CommissionRecordView[];
      this.payrollLeaveRecords = leaves
        .filter(l => l.status === 'APPROVED')
        .map(l => this.toPayrollLeaveRecord(l));
      this.computePayrollKpi();
      this.payrollLoading = false;
      this.cdr.markForCheck();
    });
  }

  onPayrollMonthChange(month: string): void {
    this.payrollSelectedMonth = month;
    this.loadPayrollData();
  }

  onGenerateSlip(slip: SalarySlipView): void {
    this.payrollSvc.generateSalarySlip({
      employeeId: slip.staffId,
      month: slip.month,
      basicSalary: slip.basicSalary,
      hra: slip.hra,
      ...(slip as any),
      commission: slip.commission,
      bonus: slip.bonus,
      pf: slip.pf,
      tax: slip.tax
    } as any).pipe(takeUntil(this.destroy$)).subscribe(() => this.loadPayrollData());
  }

  onPayCommission(id: string): void {
    const record = this.payrollCommissionRecords.find(c => c.id === id);
    if (!record) return;
    this.payrollSvc.markCommissionPaid(record as CommissionRecord)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadPayrollData());
  }

  private computePayrollKpi(): void {
    const slips = this.payrollSalarySlips;
    this.payrollSalaryKpi = {
      totalPayroll: slips.reduce((s, x) => s + x.netSalary, 0),
      thisMonth: slips.reduce((s, x) => s + x.netSalary, 0),
      processed: slips.filter(x => x.status !== 'GENERATED').length,
      pending: slips.filter(x => x.status === 'GENERATED').length,
      paidCount: slips.filter(x => x.status === 'PAID').length,
      holdCount: slips.filter(x => x.status === 'HOLD').length
    };
    const comm = this.payrollCommissionRecords;
    this.payrollCommissionKpi = {
      totalSales: comm.reduce((s, c) => s + c.salesAmount, 0),
      totalCommission: comm.reduce((s, c) => s + c.commissionAmount, 0),
      pending: comm.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.commissionAmount, 0),
      paid: comm.filter(c => c.status === 'PAID').reduce((s, c) => s + c.commissionAmount, 0)
    };
  }

  private toSalarySlipView(s: SalarySlip): SalarySlipView {
    return {
      id: s.id,
      staffId: s.staffId,
      staffName: s.staffName,
      month: s.month,
      basicSalary: s.basicSalary,
      hra: s.hra,
      shiftAllowance: s.shiftAllowance,
      leaveDeductions: s.leaveDeductions,
      commission: s.commission,
      bonus: s.bonus,
      grossSalary: s.grossSalary,
      pf: s.pf,
      tax: s.tax,
      netSalary: s.netSalary,
      status: s.status as any,
      generatedDate: s.generatedDate,
      paymentDate: s.paymentDate
    };
  }

  private toPayrollLeaveRecord(l: LeaveRequest): PayrollLeaveRecord {
    const typeMap: Record<string, 'PAID' | 'UNPAID' | 'SICK'> = {
      SICK: 'SICK', UNPAID: 'UNPAID', CASUAL: 'PAID', EARNED: 'PAID'
    };
    return {
      staffId: l.staffId,
      startDate: new Date(l.startDate).toISOString().split('T')[0],
      endDate: new Date(l.endDate).toISOString().split('T')[0],
      type: typeMap[l.leaveType] ?? 'PAID',
      days: l.days
    };
  }

  /* ================= DISPLAY HELPERS ================= */

  getAvatarColor(name: string): string {
    const palette = ['#4f46e5','#0891b2','#16a34a','#d97706','#7c3aed','#be185d','#0f766e'];
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
    return palette[hash % palette.length];
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

  trackByStaffId(_: number, item: StaffCard): string {
    return item.id;
  }

  /* ================= PRIVATE HELPERS ================= */

  private getEmptyStaffForm(): StaffFormModel {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      departmentId: 0,
      salary: null,
      status: 'ACTIVE',
      hireDate: ''
    };
  }

  private buildKpi(): void {
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
}
