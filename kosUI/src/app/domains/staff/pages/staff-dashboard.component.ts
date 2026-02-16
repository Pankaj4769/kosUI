import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TableService } from '../../pos/services/table.service';
import { Table } from '../../pos/models/table.model';
import { StaffAnalyticsService } from '../services/staff-analytics.service';
import { StaffService, StaffMember } from '../services/staff.service';
import { RoleService, Role } from '../services/role.service';

/* ================= INTERFACES ================= */

interface StaffCard {
  id: string;
  name: string;
  role: string;
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
  email?: string;
  phone?: string;
  roleId?: number;
  joinDate?: Date;
}

interface ShiftRecord {
  date: Date;
  startTime: string;
  endTime: string;
  hoursWorked: number;
  performance: number;
}

interface Award {
  title: string;
  date: Date;
  icon: string;
}

// New interfaces for enhanced features
interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: Date;
  clockIn: string | null;
  clockOut: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  totalHours: number;
  notes?: string;
}

interface CommissionRecord {
  id: string;
  staffId: string;
  staffName: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  month: string;
  status: 'PENDING' | 'PAID';
  paidDate?: Date;
}

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'SICK' | 'CASUAL' | 'EARNED' | 'UNPAID';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
}

interface SalarySlip {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  basicSalary: number;
  hra: number;
  commission: number;
  bonus: number;
  grossSalary: number;
  pf: number;
  tax: number;
  deductions: number;
  netSalary: number;
  status: 'GENERATED' | 'SENT' | 'PENDING';
  generatedDate: Date;
}

interface ShiftTemplate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  isActive: boolean;
}

interface ShiftAssignment {
  id: string;
  staffId: string;
  staffName: string;
  shiftId: string;
  shiftName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'MISSED';
}

type ViewMode = 'list' | 'grid';
type ActiveTab = 'directory' | 'attendance' | 'commission' | 'leave' | 'salary' | 'shift' | 'roster';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffDashboardComponent implements OnInit, OnDestroy {

  tables: Table[] = [];
  staffCards: StaffCard[] = [];
  roles: Role[] = [];

  // KPI Data
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

  // Attendance Data
  attendanceRecords: AttendanceRecord[] = [];
  attendanceKpi = {
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0
  };
  selectedAttendanceDate: Date = new Date();

  // Commission Data
  commissionRecords: CommissionRecord[] = [];
  commissionKpi = {
    totalSales: 0,
    totalCommission: 0,
    pending: 0,
    paid: 0
  };
  commissionCalculator = {
    salesAmount: 0,
    rate: 0,
    commission: 0
  };

  // Leave Management Data
  leaveRequests: LeaveRequest[] = [];
  leaveKpi = {
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDays: 0
  };
  leaveFilter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';

  // Salary Data
  salarySlips: SalarySlip[] = [];
  salaryKpi = {
    totalPayroll: 0,
    thisMonth: 0,
    processed: 0,
    pending: 0
  };
  selectedSalaryMonth: string = this.getCurrentMonth();
  selectedStaffForSalary: string = '';

  // Shift Management Data
  shiftTemplates: ShiftTemplate[] = [];
  shiftAssignments: ShiftAssignment[] = [];
  shiftKpi = {
    activeShifts: 0,
    onDuty: 0,
    offDuty: 0,
    currentShift: ''
  };
  selectedShiftDate: Date = new Date();

  // Filter and view state
  filterStatus: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE' = 'ALL';
  sortBy: 'rank' | 'revenue' | 'efficiency' | 'load' | 'performance' | 'lastActive' = 'rank';
  viewMode: ViewMode = 'list';
  activeTab: ActiveTab = 'directory';
  searchTerm: string = '';

  // Modal state
  selectedStaff: StaffCard | null = null;
  showStaffModal: boolean = false;
  
  // Add Staff Modal state
  showAddStaffModal: boolean = false;
  isEditingStaff: boolean = false;
  editingStaffId: string | null = null;
  
  // Add Staff Form
  newStaff = {
    name: '',
    email: '',
    phone: '',
    roleId: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  };

  // Attendance Modal
  showAttendanceModal: boolean = false;
  selectedAttendance: AttendanceRecord | null = null;

  // Leave Modal
  showLeaveModal: boolean = false;
  showLeaveRequestModal: boolean = false;
  selectedLeave: LeaveRequest | null = null;
  newLeaveRequest: Partial<LeaveRequest> = {};

  // Salary Modal
  showSalarySlipModal: boolean = false;
  selectedSalarySlip: SalarySlip | null = null;

  // Shift Modal
  showShiftModal: boolean = false;
  showShiftTemplateModal: boolean = false;
  selectedShift: ShiftTemplate | null = null;
  newShiftTemplate: Partial<ShiftTemplate> = {};

  private destroy$ = new Subject<void>();
  private cachedOrders: any[] = [];
  private allStaffCards: StaffCard[] = [];
  staffMembers: StaffMember[] = [];

  constructor(
    private tableService: TableService,
    private staffService: StaffAnalyticsService,
    private staffMemberService: StaffService,
    private roleService: RoleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= INITIALIZATION ================= */

  private initializeData(): void {
    // Load roles
    this.roleService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.roles = roles;
        this.cdr.markForCheck();
      });

    // Load staff members
    this.staffMemberService.getStaff()
      .pipe(takeUntil(this.destroy$))
      .subscribe(staff => {
        this.staffMembers = staff;
        this.buildDashboard();
        this.loadAttendanceData();
        this.loadCommissionData();
        this.loadLeaveData();
        this.loadSalaryData();
        this.loadShiftData();
        this.cdr.markForCheck();
      });

    // Load tables
    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.tables = [...tables];
        this.cachedOrders = this.buildOrders();
        this.buildDashboard();
        this.cdr.markForCheck();
      });
  }

  private setupAutoRefresh(): void {
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.buildDashboard();
        if (this.activeTab === 'attendance') {
          this.loadAttendanceData();
        }
        this.cdr.markForCheck();
      });
  }

  /* ================= TYPE GUARDS ================= */

  get isStaffSelected(): boolean {
    return this.selectedStaff !== null && this.selectedStaff !== undefined;
  }

  /* ================= BUILD DASHBOARD (Existing) ================= */

  buildDashboard() {
    const cards: StaffCard[] = this.staffMembers.map((member) => {
      const stats = this.staffService.calculate(member.name, this.tables, this.cachedOrders);

      const activeTables = this.tables.filter(
        t => t.waiter === member.name && t.status === 'occupied'
      ).length;

      const score = Math.round(
        stats.loadScore * 0.35 +
        stats.efficiencyScore * 0.45 +
        Math.min(stats.revenue / 100, 100) * 0.20
      );

      const status: 'BUSY' | 'NORMAL' | 'IDLE' =
        stats.loadScore > 75 || activeTables > 4 ? 'BUSY' :
        stats.loadScore < 15 && activeTables === 0 ? 'IDLE' :
        'NORMAL';

      const onDutyStatus: 'ON DUTY' | 'OFF DUTY' = 
        activeTables > 0 || status !== 'IDLE' ? 'ON DUTY' : 'OFF DUTY';

      const workloadIndex = Math.min(
        Math.round((stats.loadScore + activeTables * 10) / 2),
        100
      );

      const productivityIndex = Math.min(
        Math.round((stats.efficiencyScore * 0.6) + (Math.min(stats.revenue / 100, 100) * 0.4)),
        100
      );

      const consistencyScore = Math.max(
        100 - Math.abs(stats.loadScore - stats.efficiencyScore),
        10
      );

      const fatigueScore = Math.min(
        Math.round(workloadIndex * 0.7 + (100 - stats.efficiencyScore) * 0.3),
        100
      );

      const heatLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
        workloadIndex > 75 ? 'HIGH' :
        workloadIndex > 40 ? 'MEDIUM' :
        'LOW';

      const trend: 'UP' | 'DOWN' | 'STABLE' =
        stats.efficiencyScore > 70 && productivityIndex > 60 ? 'UP' :
        stats.efficiencyScore < 40 || productivityIndex < 30 ? 'DOWN' :
        'STABLE';

      const slaRisk = stats.avgServiceTime > 60;

      const alertLevel: 'NONE' | 'WARNING' | 'CRITICAL' =
        fatigueScore > 80 || slaRisk ? 'CRITICAL' :
        fatigueScore > 60 || workloadIndex > 85 ? 'WARNING' :
        'NONE';

      const currentHour = new Date().getHours();
      const peakHours = currentHour >= 12 && currentHour <= 14 ? 'Lunch Rush' :
                        currentHour >= 19 && currentHour <= 21 ? 'Dinner Rush' :
                        'Off-Peak';

      const performance = Math.round((stats.efficiencyScore / 100) * 5 * 10) / 10;

      const weeklyPerformance = this.generateWeeklyPerformance();
      const shiftHistory = this.generateShiftHistory();
      const awards = this.generateAwards(performance);

      return {
        id: member.id,
        name: member.name,
        role: member.roleName,
        roleId: member.roleId,
        email: member.email,
        phone: member.phone,
        joinDate: member.joinDate,
        load: stats.loadScore,
        efficiency: stats.efficiencyScore,
        revenue: stats.revenue,
        activeTables,
        rank: 0,
        status,
        onDutyStatus,
        lastActive: new Date(),
        performance,
        score,
        workloadIndex,
        productivityIndex,
        consistencyScore,
        fatigueScore,
        heatLevel,
        trend,
        slaRisk,
        completedOrders: stats.completedOrders,
        avgServiceTime: stats.avgServiceTime,
        peakHours,
        alertLevel,
        weeklyPerformance,
        shiftHistory,
        awards
      };
    });

    this.sortCards(cards);
    cards.forEach((c, i) => c.rank = i + 1);

    this.allStaffCards = cards;
    this.applyFilter();
    this.buildKpi();
  }

  /* ================= ATTENDANCE MANAGEMENT ================= */

  loadAttendanceData(): void {
    // Sample data - replace with API call
    this.attendanceRecords = this.staffMembers.map(staff => ({
      id: `ATT-${staff.id}`,
      staffId: staff.id,
      staffName: staff.name,
      date: this.selectedAttendanceDate,
      clockIn: this.getRandomTime('09:00', '09:30'),
      clockOut: this.getRandomTime('17:00', '18:00'),
      status: this.getRandomAttendanceStatus(),
      totalHours: 8,
      notes: ''
    }));

    this.calculateAttendanceKpi();
    this.cdr.markForCheck();
  }

  private calculateAttendanceKpi(): void {
    this.attendanceKpi = {
      present: this.attendanceRecords.filter(a => a.status === 'PRESENT').length,
      absent: this.attendanceRecords.filter(a => a.status === 'ABSENT').length,
      late: this.attendanceRecords.filter(a => a.status === 'LATE').length,
      onLeave: this.attendanceRecords.filter(a => a.status === 'ON_LEAVE').length
    };
  }

  markAttendance(staffId: string, status: AttendanceRecord['status']): void {
    const record = this.attendanceRecords.find(a => a.staffId === staffId);
    if (record) {
      record.status = status;
      if (status === 'PRESENT' || status === 'LATE') {
        record.clockIn = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      }
      this.calculateAttendanceKpi();
      this.showNotification('Attendance marked successfully', 'success');
      this.cdr.markForCheck();
    }
  }

  clockOut(staffId: string): void {
    const record = this.attendanceRecords.find(a => a.staffId === staffId);
    if (record) {
      record.clockOut = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      this.showNotification('Clocked out successfully', 'success');
      this.cdr.markForCheck();
    }
  }

  viewAttendanceDetails(record: AttendanceRecord): void {
    this.selectedAttendance = record;
    this.showAttendanceModal = true;
    this.cdr.markForCheck();
  }

  closeAttendanceModal(): void {
    this.showAttendanceModal = false;
    this.selectedAttendance = null;
    this.cdr.markForCheck();
  }

  /* ================= COMMISSION MANAGEMENT ================= */

  private loadCommissionData(): void {
    // Sample data - replace with API call
    this.commissionRecords = this.staffMembers.slice(0, 10).map((staff, index) => ({
      id: `COM-${index + 1}`,
      staffId: staff.id,
      staffName: staff.name,
      salesAmount: Math.floor(Math.random() * 100000) + 20000,
      commissionRate: Math.floor(Math.random() * 8) + 3,
      commissionAmount: 0,
      month: this.getCurrentMonth(),
      status: Math.random() > 0.5 ? 'PAID' : 'PENDING'
    }));

    // Calculate commission amounts
    this.commissionRecords.forEach(record => {
      record.commissionAmount = (record.salesAmount * record.commissionRate) / 100;
    });

    this.calculateCommissionKpi();
    this.cdr.markForCheck();
  }

  private calculateCommissionKpi(): void {
    this.commissionKpi = {
      totalSales: this.commissionRecords.reduce((sum, r) => sum + r.salesAmount, 0),
      totalCommission: this.commissionRecords.reduce((sum, r) => sum + r.commissionAmount, 0),
      pending: this.commissionRecords.filter(r => r.status === 'PENDING').reduce((sum, r) => sum + r.commissionAmount, 0),
      paid: this.commissionRecords.filter(r => r.status === 'PAID').reduce((sum, r) => sum + r.commissionAmount, 0)
    };
  }

  calculateCommission(): void {
    this.commissionCalculator.commission = 
      (this.commissionCalculator.salesAmount * this.commissionCalculator.rate) / 100;
    this.cdr.markForCheck();
  }

  addCommissionRecord(): void {
    if (this.commissionCalculator.salesAmount > 0 && this.commissionCalculator.rate > 0) {
      // Add new commission record logic
      this.showNotification('Commission record added successfully', 'success');
      this.commissionCalculator = { salesAmount: 0, rate: 0, commission: 0 };
      this.cdr.markForCheck();
    }
  }

  payCommission(recordId: string): void {
    const record = this.commissionRecords.find(r => r.id === recordId);
    if (record) {
      record.status = 'PAID';
      record.paidDate = new Date();
      this.calculateCommissionKpi();
      this.showNotification('Commission paid successfully', 'success');
      this.cdr.markForCheck();
    }
  }

  /* ================= LEAVE MANAGEMENT ================= */

  private loadLeaveData(): void {
    // Sample data - replace with API call
    this.leaveRequests = [
      {
        id: 'LR-001',
        staffId: 'STF-01',
        staffName: 'Sarah Jenkins',
        leaveType: 'SICK',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-17'),
        days: 3,
        reason: 'Medical appointment',
        status: 'PENDING',
        appliedDate: new Date('2026-02-10')
      },
      {
        id: 'LR-002',
        staffId: 'STF-02',
        staffName: 'Marcus Chen',
        leaveType: 'CASUAL',
        startDate: new Date('2026-02-20'),
        endDate: new Date('2026-02-21'),
        days: 2,
        reason: 'Personal work',
        status: 'APPROVED',
        appliedDate: new Date('2026-02-12'),
        approvedBy: 'Manager',
        approvedDate: new Date('2026-02-13')
      }
    ];

    this.calculateLeaveKpi();
    this.cdr.markForCheck();
  }

  private calculateLeaveKpi(): void {
    this.leaveKpi = {
      pending: this.leaveRequests.filter(l => l.status === 'PENDING').length,
      approved: this.leaveRequests.filter(l => l.status === 'APPROVED').length,
      rejected: this.leaveRequests.filter(l => l.status === 'REJECTED').length,
      totalDays: this.leaveRequests
        .filter(l => l.status === 'APPROVED')
        .reduce((sum, l) => sum + l.days, 0)
    };
  }

  get filteredLeaveRequests(): LeaveRequest[] {
    if (this.leaveFilter === 'ALL') {
      return this.leaveRequests;
    }
    return this.leaveRequests.filter(l => l.status === this.leaveFilter);
  }

  approveLeave(leaveId: string): void {
    const leave = this.leaveRequests.find(l => l.id === leaveId);
    if (leave) {
      leave.status = 'APPROVED';
      leave.approvedBy = 'Current Manager';
      leave.approvedDate = new Date();
      this.calculateLeaveKpi();
      this.showNotification('Leave approved successfully', 'success');
      this.cdr.markForCheck();
    }
  }

  rejectLeave(leaveId: string, reason?: string): void {
    const leave = this.leaveRequests.find(l => l.id === leaveId);
    if (leave) {
      leave.status = 'REJECTED';
      leave.rejectionReason = reason || 'Not specified';
      this.calculateLeaveKpi();
      this.showNotification('Leave rejected', 'success');
      this.cdr.markForCheck();
    }
  }

  openLeaveRequestModal(): void {
    this.showLeaveRequestModal = true;
    this.newLeaveRequest = {};
    this.cdr.markForCheck();
  }

  closeLeaveRequestModal(): void {
    this.showLeaveRequestModal = false;
    this.newLeaveRequest = {};
    this.cdr.markForCheck();
  }

  submitLeaveRequest(): void {
    // Add leave request logic
    this.showNotification('Leave request submitted successfully', 'success');
    this.closeLeaveRequestModal();
  }

  /* ================= SALARY MANAGEMENT ================= */

  private loadSalaryData(): void {
    // Sample data - replace with API call
    this.salarySlips = this.staffMembers.slice(0, 10).map((staff, index) => {
      const basicSalary = 35000 + (index * 5000);
      const hra = basicSalary * 0.2;
      const commission = Math.floor(Math.random() * 10000);
      const bonus = Math.floor(Math.random() * 5000);
      const grossSalary = basicSalary + hra + commission + bonus;
      const pf = basicSalary * 0.12;
      const tax = grossSalary * 0.05;
      const deductions = pf + tax;
      const netSalary = grossSalary - deductions;

      return {
        id: `SAL-${index + 1}`,
        staffId: staff.id,
        staffName: staff.name,
        month: this.getCurrentMonth(),
        basicSalary,
        hra,
        commission,
        bonus,
        grossSalary,
        pf,
        tax,
        deductions,
        netSalary,
        status: Math.random() > 0.3 ? 'SENT' : 'PENDING',
        generatedDate: new Date()
      };
    });

    this.calculateSalaryKpi();
    this.cdr.markForCheck();
  }

  private calculateSalaryKpi(): void {
    this.salaryKpi = {
      totalPayroll: this.salarySlips.reduce((sum, s) => sum + s.netSalary, 0),
      thisMonth: this.salarySlips.reduce((sum, s) => sum + s.netSalary, 0),
      processed: this.salarySlips.filter(s => s.status === 'SENT').length,
      pending: this.salarySlips.filter(s => s.status === 'PENDING').length
    };
  }

  generateSalarySlip(): void {
    if (this.selectedStaffForSalary) {
      this.showNotification('Salary slip generated successfully', 'success');
      this.loadSalaryData();
    }
  }

  viewSalarySlip(slip: SalarySlip): void {
    this.selectedSalarySlip = slip;
    this.showSalarySlipModal = true;
    this.cdr.markForCheck();
  }

  closeSalarySlipModal(): void {
    this.showSalarySlipModal = false;
    this.selectedSalarySlip = null;
    this.cdr.markForCheck();
  }

  downloadSalarySlip(slipId: string): void {
    this.showNotification('Salary slip downloaded', 'success');
  }

  emailSalarySlip(slipId: string): void {
    this.showNotification('Salary slip emailed to employee', 'success');
  }

  /* ================= SHIFT MANAGEMENT ================= */

  private loadShiftData(): void {
    // Sample shift templates
    this.shiftTemplates = [
      { id: 'SFT-1', name: 'Morning Shift', startTime: '08:00', endTime: '16:00', duration: 8, isActive: true },
      { id: 'SFT-2', name: 'Evening Shift', startTime: '16:00', endTime: '00:00', duration: 8, isActive: true },
      { id: 'SFT-3', name: 'Night Shift', startTime: '00:00', endTime: '08:00', duration: 8, isActive: true }
    ];

    // Sample shift assignments
    this.shiftAssignments = this.staffMembers.map((staff, index) => ({
      id: `SA-${index + 1}`,
      staffId: staff.id,
      staffName: staff.name,
      shiftId: this.shiftTemplates[index % 3].id,
      shiftName: this.shiftTemplates[index % 3].name,
      date: this.selectedShiftDate,
      startTime: this.shiftTemplates[index % 3].startTime,
      endTime: this.shiftTemplates[index % 3].endTime,
      status: 'ACTIVE'
    }));

    this.calculateShiftKpi();
    this.cdr.markForCheck();
  }

  private calculateShiftKpi(): void {
    const currentTime = new Date().getHours();
    let currentShift = '';

    if (currentTime >= 8 && currentTime < 16) currentShift = 'Morning Shift';
    else if (currentTime >= 16 || currentTime < 0) currentShift = 'Evening Shift';
    else currentShift = 'Night Shift';

    this.shiftKpi = {
      activeShifts: this.shiftTemplates.filter(s => s.isActive).length,
      onDuty: this.shiftAssignments.filter(s => s.status === 'ACTIVE').length,
      offDuty: this.staffMembers.length - this.shiftAssignments.filter(s => s.status === 'ACTIVE').length,
      currentShift
    };
  }

  getShiftAssignmentsByShift(shiftId: string): ShiftAssignment[] {
    return this.shiftAssignments.filter(a => a.shiftId === shiftId);
  }

  openShiftTemplateModal(shift?: ShiftTemplate): void {
    this.showShiftTemplateModal = true;
    if (shift) {
      this.selectedShift = shift;
      this.newShiftTemplate = { ...shift };
    } else {
      this.selectedShift = null;
      this.newShiftTemplate = {};
    }
    this.cdr.markForCheck();
  }

  closeShiftTemplateModal(): void {
    this.showShiftTemplateModal = false;
    this.selectedShift = null;
    this.newShiftTemplate = {};
    this.cdr.markForCheck();
  }

  saveShiftTemplate(): void {
    // Save shift template logic
    this.showNotification('Shift template saved successfully', 'success');
    this.closeShiftTemplateModal();
    this.loadShiftData();
  }

  /* ================= EXISTING METHODS (Keep all previous methods) ================= */

  private sortCards(cards: StaffCard[]) {
    switch (this.sortBy) {
      case 'rank':
      case 'efficiency':
        cards.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'revenue':
        cards.sort((a, b) => b.revenue - a.revenue);
        break;
      case 'load':
        cards.sort((a, b) => b.load - a.load);
        break;
      case 'performance':
        cards.sort((a, b) => b.performance - a.performance);
        break;
      case 'lastActive':
        cards.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
        break;
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
        s.role.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      );
    }

    this.staffCards = filtered;
    this.cdr.markForCheck();
  }

  setFilter(status: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE') {
    this.filterStatus = status;
    this.applyFilter();
  }

  setSorting(sortBy: 'rank' | 'revenue' | 'efficiency' | 'load' | 'performance' | 'lastActive') {
    this.sortBy = sortBy;
    this.buildDashboard();
  }

  onSearchChange() {
    this.applyFilter();
  }

  toggleViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.cdr.markForCheck();
  }

  setActiveTab(tab: ActiveTab) {
    this.activeTab = tab;
    
    // Load tab-specific data
    switch(tab) {
      case 'attendance':
        this.loadAttendanceData();
        break;
      case 'commission':
        this.loadCommissionData();
        break;
      case 'leave':
        this.loadLeaveData();
        break;
      case 'salary':
        this.loadSalaryData();
        break;
      case 'shift':
        this.loadShiftData();
        break;
    }
    
    this.cdr.markForCheck();
  }

  private buildKpi() {
    const totalStaff = this.allStaffCards.length;
    const onDuty = this.allStaffCards.filter(s => s.onDutyStatus === 'ON DUTY').length;
    const busyStaff = this.allStaffCards.filter(s => s.status === 'BUSY').length;
    const idleStaff = this.allStaffCards.filter(s => s.status === 'IDLE').length;

    const avgEfficiency = totalStaff
      ? Math.round(this.allStaffCards.reduce((a, b) => a + b.efficiency, 0) / totalStaff)
      : 0;

    const totalRevenue = this.allStaffCards.reduce((a, b) => a + b.revenue, 0);
    const avgRevenue = totalStaff ? Math.round(totalRevenue / totalStaff) : 0;
    
    const totalActiveTables = this.allStaffCards.reduce((a, b) => a + b.activeTables, 0);
    
    const awards = this.allStaffCards.reduce((a, b) => a + (b.awards?.length || 0), 0);

    this.kpi = {
      totalStaff,
      onDuty,
      busyStaff,
      idleStaff,
      avgEfficiency,
      totalRevenue,
      avgRevenue,
      totalActiveTables,
      awards
    };
  }

  private buildOrders() {
    return this.tables
      .filter(t => t.status !== 'available')
      .map(t => ({
        waiter: t.waiter,
        amount: t.amount || 0,
        duration: (t as any).duration || Math.floor(Math.random() * 45) + 15,
        status: t.status === 'available' ? 'PAID' : 'ACTIVE'
      }));
  }

  openAddStaffModal() {
    this.showAddStaffModal = true;
    this.isEditingStaff = false;
    this.editingStaffId = null;
    this.resetStaffForm();
    this.cdr.markForCheck();
  }

  openEditStaffModal(staff: StaffCard) {
    this.showAddStaffModal = true;
    this.isEditingStaff = true;
    this.editingStaffId = staff.id;
    
    this.newStaff = {
      name: staff.name,
      email: staff.email || '',
      phone: staff.phone || '',
      roleId: staff.roleId || 0,
      status: 'ACTIVE'
    };
    
    this.cdr.markForCheck();
  }

  closeAddStaffModal() {
    this.showAddStaffModal = false;
    this.isEditingStaff = false;
    this.editingStaffId = null;
    this.resetStaffForm();
    this.cdr.markForCheck();
  }

  resetStaffForm() {
    this.newStaff = {
      name: '',
      email: '',
      phone: '',
      roleId: 0,
      status: 'ACTIVE'
    };
  }

  saveStaff() {
    if (!this.newStaff.name.trim() || !this.newStaff.email.trim() || this.newStaff.roleId === 0) {
      this.showNotification('Please fill all required fields', 'error');
      return;
    }

    const role = this.roles.find(r => r.id === this.newStaff.roleId);
    if (!role) {
      this.showNotification('Invalid role selected', 'error');
      return;
    }

    if (this.isEditingStaff && this.editingStaffId) {
      this.staffMemberService.updateStaff(this.editingStaffId, {
        name: this.newStaff.name,
        email: this.newStaff.email,
        phone: this.newStaff.phone,
        roleId: this.newStaff.roleId,
        roleName: role.name,
        status: this.newStaff.status
      }).subscribe({
        next: () => {
          this.showNotification('Staff member updated successfully!', 'success');
          this.closeAddStaffModal();
        },
        error: () => {
          this.showNotification('Failed to update staff member', 'error');
        }
      });
    } else {
      this.staffMemberService.addStaff({
        name: this.newStaff.name,
        email: this.newStaff.email,
        phone: this.newStaff.phone,
        roleId: this.newStaff.roleId,
        roleName: role.name,
        status: this.newStaff.status,
        joinDate: new Date()
      }).subscribe({
        next: () => {
          this.showNotification('Staff member added successfully!', 'success');
          this.closeAddStaffModal();
        },
        error: () => {
          this.showNotification('Failed to add staff member', 'error');
        }
      });
    }
  }

  deleteStaffMember(staffId: string) {
    if (confirm('Are you sure you want to remove this staff member?')) {
      this.staffMemberService.deleteStaff(staffId).subscribe({
        next: () => {
          this.showNotification('Staff member removed successfully!', 'success');
        },
        error: () => {
          this.showNotification('Failed to remove staff member', 'error');
        }
      });
    }
  }

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

  autoGenerateRoster() {
    console.log('Auto-generate roster using AI');
  }

  trackByStaffId(_: number, staff: StaffCard) {
    return staff.id;
  }

  /* ================= HELPER METHODS ================= */

  getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#fb923c';
    return '#ef4444';
  }

  getPerformanceStars(rating: number): string[] {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const stars: string[] = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalf) {
      stars.push('⯨');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars;
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getAddStaffModalTitle(): string {
    return this.isEditingStaff ? 'Edit Staff Member' : 'Add New Staff Member';
  }

  getSelectedRoleDescription(): string {
    const role = this.roles.find(r => r.id === this.newStaff.roleId);
    return role?.description || '';
  }

  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#22c55e' : '#ef4444'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10001;
      animation: slideIn 0.3s ease-out;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private generateWeeklyPerformance(): number[] {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 30) + 70);
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

  private generateAwards(performance: number): Award[] {
    if (performance >= 4.5) {
      return [
        { title: 'Employee of the Month', date: new Date(), icon: '🏆' },
        { title: 'Perfect Attendance', date: new Date(), icon: '⭐' }
      ];
    }
    return [];
  }

  private getRandomTime(start: string, end: string): string {
    const startHour = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    const hour = Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private getRandomAttendanceStatus(): AttendanceRecord['status'] {
    const rand = Math.random();
    if (rand > 0.9) return 'ABSENT';
    if (rand > 0.8) return 'LATE';
    if (rand > 0.95) return 'ON_LEAVE';
    return 'PRESENT';
  }

  private getCurrentMonth(): string {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getAttendanceStatusColor(status: string): string {
    const colors = {
      'PRESENT': '#22c55e',
      'ABSENT': '#ef4444',
      'LATE': '#fbbf24',
      'HALF_DAY': '#fb923c',
      'ON_LEAVE': '#6366f1'
    };
    return colors[status as keyof typeof colors] || '#999';
  }

  getLeaveTypeLabel(type: string): string {
    const labels = {
      'SICK': 'Sick Leave',
      'CASUAL': 'Casual Leave',
      'EARNED': 'Earned Leave',
      'UNPAID': 'Unpaid Leave'
    };
    return labels[type as keyof typeof labels] || type;
  }
}
