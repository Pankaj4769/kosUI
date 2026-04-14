import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PayrollService } from '../../services/payroll.service';
import { StaffService } from '../../services/staff.service';
import { LeaveService } from '../../services/leave.service';
import { ShiftService } from '../../services/shift.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SalarySlip, CommissionRecord } from '../../models/payroll.model';
import { LeaveRequest } from '../../models/leave.model';

// --- Interfaces ---
export type PayrollStatus = 'GENERATED' | 'SENT' | 'PAID' | 'HOLD';
export type CommissionStatus = 'PENDING' | 'PAID';

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
  baseSalary: number;
  bankDetails?: string;
  email?: string;
}

export interface ShiftRecord {
  staffId: string;
  date: string;
  shiftType: string;
  isPresent: boolean;
}

export interface LeaveRecord {
  staffId: string;
  startDate: string;
  endDate: string;
  type: 'PAID' | 'UNPAID' | 'SICK';
  days: number;
}

export interface SalarySlipView {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  basicSalary: number;
  hra: number;
  shiftAllowance: number;
  leaveDeductions: number;
  commission: number;
  bonus: number;
  grossSalary: number;
  pf: number;
  tax: number;
  netSalary: number;
  status: PayrollStatus;
  generatedDate: Date;
  paymentDate?: Date;
}

export interface CommissionRecordView {
  id: string;
  staffId: string;
  staffName: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  month: string;
  status: CommissionStatus;
  paidDate?: Date;
}

export interface SalaryKpi {
  totalPayroll: number;
  thisMonth: number;
  processed: number;
  pending: number;
  paidCount: number;
  holdCount: number;
}

export interface CommissionKpi {
  totalSales: number;
  totalCommission: number;
  pending: number;
  paid: number;
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.component.html',
  styleUrls: ['./payroll.component.css']
})
export class PayrollComponent implements OnInit, OnChanges, OnDestroy {

  constructor(
    private payrollSvc: PayrollService,
    private staffSvc: StaffService,
    private leaveSvc: LeaveService,
    private shiftSvc: ShiftService,
    private authSvc: AuthService
  ) {}

  // ============= INPUTS =============
  @Input() salarySlips: SalarySlipView[] = [];
  @Input() salaryKpi!: SalaryKpi;
  @Input() commissionRecords: CommissionRecordView[] = [];
  @Input() commissionKpi!: CommissionKpi;

  @Input() selectedMonth: string = new Date().toISOString().slice(0, 7);
  @Input() selectedStaffId: string = '';

  @Input() staffDirectory: StaffProfile[] = [];
  @Input() shiftRecords: ShiftRecord[] = [];
  @Input() leaveRecords: LeaveRecord[] = [];

  @Input() calculator = { salesAmount: 0, rate: 0, commission: 0 };

  // ============= OUTPUTS =============
  @Output() generateSlip = new EventEmitter<SalarySlipView>();
  @Output() downloadSlip = new EventEmitter<string>();
  @Output() emailSlip = new EventEmitter<string>();
  @Output() payCommission = new EventEmitter<string>();
  @Output() bulkCommission = new EventEmitter<{ rate: number; month: string }>();
  @Output() downloadSalaryReport = new EventEmitter<string>();
  @Output() calculatorChange = new EventEmitter<{ salesAmount: number; rate: number }>();
  @Output() selectedStaffChange = new EventEmitter<string>();
  @Output() selectedMonthChange = new EventEmitter<string>();

  // ============= STATE =============
  previewSlip: SalarySlipView | null = null;
  showSalaryStatusModal = false;
  showBulkCommissionModal = false;
  salaryStatusFilter: 'paid' | 'hold' = 'paid';
  loading = false;

  bulkCommissionForm: { rate: number; month: string; salesTeam: string[] } = {
    rate: 1.5,
    month: '',
    salesTeam: []
  };

  // Whether this component is embedded in a parent (inputs provided) or standalone
  private standalone = false;
  private destroy$ = new Subject<void>();

  // ============= CONSTANTS =============
  readonly SHIFT_ALLOWANCE_RATE = 200;
  readonly NIGHT_SHIFT_KEY = 'Night';
  readonly PAID_LEAVE_LIMIT = 2;

  // ============= LIFECYCLE =============

  ngOnInit(): void {
    // Detect standalone mode: no parent has provided salaryKpi
    this.standalone = !this.salaryKpi;

    if (this.standalone) {
      this.salaryKpi    = { totalPayroll: 0, thisMonth: 0, processed: 0, pending: 0, paidCount: 0, holdCount: 0 };
      this.commissionKpi = { totalSales: 0, totalCommission: 0, pending: 0, paid: 0 };
      this.loadStaffDirectory();
      this.loadPayrollData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedStaffId'] || changes['selectedMonth']) {
      this.calculatePreview();
    }
    // If parent changes the month and we are standalone, reload
    if (this.standalone && changes['selectedMonth'] && !changes['selectedMonth'].firstChange) {
      this.loadPayrollData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============= STANDALONE DATA LOADING =============

  private loadStaffDirectory(): void {
    const restaurantId = this.authSvc.currentUser?.restaurantId ?? '';
    if (restaurantId) this.staffSvc.loadStaff(restaurantId);

    this.staffSvc.staff$.pipe(takeUntil(this.destroy$)).subscribe(members => {
      this.staffDirectory = members.map(m => ({
        id: m.id,
        name: m.name,
        role: m.position || m.roleName || '',
        baseSalary: m.salary || 0,
        email: m.email
      }));

      // Also map shift records for the current month
      this.shiftRecords = this.shiftSvc.assignments
        .filter(a => new Date(a.date).toISOString().slice(0, 7) === this.selectedMonth)
        .map(a => ({
          staffId: a.staffId,
          date: new Date(a.date).toISOString().split('T')[0],
          shiftType: a.shiftName,
          isPresent: true
        }));
    });
  }

  loadPayrollData(): void {
    if (this.loading) return;
    this.loading = true;

    combineLatest([
      this.payrollSvc.getSalarySlips(this.selectedMonth),
      this.payrollSvc.getCommissionRecords(this.selectedMonth),
      this.leaveSvc.getLeaveRequests()
    ]).pipe(takeUntil(this.destroy$)).subscribe(([slips, commissions, leaves]) => {
      this.salarySlips = slips.map(s => this.toSalarySlipView(s));
      this.commissionRecords = commissions as CommissionRecordView[];
      this.leaveRecords = leaves
        .filter((l: LeaveRequest) => l.status === 'APPROVED')
        .map((l: LeaveRequest) => this.toLeaveRecord(l));
      this.computeKpi();
      this.loading = false;
    });
  }

  private computeKpi(): void {
    const slips = this.salarySlips;
    this.salaryKpi = {
      totalPayroll: slips.reduce((s, x) => s + x.netSalary, 0),
      thisMonth:    slips.reduce((s, x) => s + x.netSalary, 0),
      processed:    slips.filter(x => x.status !== 'GENERATED').length,
      pending:      slips.filter(x => x.status === 'GENERATED').length,
      paidCount:    slips.filter(x => x.status === 'PAID').length,
      holdCount:    slips.filter(x => x.status === 'HOLD').length
    };
    const comm = this.commissionRecords;
    this.commissionKpi = {
      totalSales:      comm.reduce((s, c) => s + c.salesAmount, 0),
      totalCommission: comm.reduce((s, c) => s + c.commissionAmount, 0),
      pending: comm.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.commissionAmount, 0),
      paid:    comm.filter(c => c.status === 'PAID').reduce((s, c) => s + c.commissionAmount, 0)
    };
  }

  private toSalarySlipView(s: SalarySlip): SalarySlipView {
    return {
      id: s.id, staffId: s.staffId, staffName: s.staffName, month: s.month,
      basicSalary: s.basicSalary, hra: s.hra, shiftAllowance: s.shiftAllowance,
      leaveDeductions: s.leaveDeductions, commission: s.commission, bonus: s.bonus,
      grossSalary: s.grossSalary, pf: s.pf, tax: s.tax, netSalary: s.netSalary,
      status: s.status as PayrollStatus, generatedDate: s.generatedDate,
      paymentDate: s.paymentDate
    };
  }

  private toLeaveRecord(l: LeaveRequest): LeaveRecord {
    const typeMap: Record<string, 'PAID' | 'UNPAID' | 'SICK'> = {
      SICK: 'SICK', UNPAID: 'UNPAID', CASUAL: 'PAID', EARNED: 'PAID'
    };
    return {
      staffId: l.staffId,
      startDate: new Date(l.startDate).toISOString().split('T')[0],
      endDate:   new Date(l.endDate).toISOString().split('T')[0],
      type: typeMap[l.leaveType] ?? 'PAID',
      days: l.days
    };
  }

  // ============= CALCULATION LOGIC =============

  calculatePreview(): void {
    if (!this.selectedStaffId || !this.selectedMonth) {
      this.previewSlip = null;
      return;
    }

    const staff = this.staffDirectory.find(s => s.id === this.selectedStaffId);
    if (!staff) return;

    const basic = staff.baseSalary * 0.4;
    const hra   = staff.baseSalary * 0.2;

    const nightShifts = this.shiftRecords.filter(s =>
      s.staffId === this.selectedStaffId &&
      s.date.startsWith(this.selectedMonth) &&
      s.shiftType === this.NIGHT_SHIFT_KEY
    );
    const shiftAllowance = nightShifts.length * this.SHIFT_ALLOWANCE_RATE;

    const staffLeaves = this.leaveRecords.filter(l =>
      l.staffId === this.selectedStaffId && l.startDate.startsWith(this.selectedMonth)
    );

    let unpaidDays = 0, paidDaysTaken = 0;
    staffLeaves.forEach(leave => {
      if (leave.type === 'UNPAID') unpaidDays += leave.days;
      else if (leave.type === 'PAID') paidDaysTaken += leave.days;
    });
    if (paidDaysTaken > this.PAID_LEAVE_LIMIT) unpaidDays += (paidDaysTaken - this.PAID_LEAVE_LIMIT);

    const leaveDeductions = Math.round(unpaidDays * (staff.baseSalary / 30));

    const commissions = this.commissionRecords
      .filter(c => c.staffId === this.selectedStaffId && c.month === this.selectedMonth && c.status === 'PAID')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const gross = staff.baseSalary + shiftAllowance + commissions;
    const pf    = Math.min(basic * 0.12, 1800);
    const net   = gross - pf - leaveDeductions;

    this.previewSlip = {
      id: `SLIP-${Date.now()}`, staffId: staff.id, staffName: staff.name,
      month: this.selectedMonth, basicSalary: basic, hra, shiftAllowance,
      leaveDeductions, commission: commissions, bonus: 0, grossSalary: gross,
      pf, tax: 0, netSalary: Math.max(0, net), status: 'GENERATED', generatedDate: new Date()
    };
  }

  // ============= BULK COMMISSION =============

  openBulkCommission(): void {
    this.bulkCommissionForm.month = this.selectedMonth || new Date().toISOString().slice(0, 7);
    this.bulkCommissionForm.rate  = 1.5;
    this.showBulkCommissionModal  = true;
  }

  confirmBulkCommission(): void {
    this.bulkCommission.emit({ rate: this.bulkCommissionForm.rate, month: this.bulkCommissionForm.month });
    this.showBulkCommissionModal = false;
  }

  getCommissionForStaff(staff: StaffProfile): number {
    return Math.round(staff.baseSalary * this.bulkCommissionForm.rate / 100);
  }

  // ============= SALARY STATUS MODAL =============

  openSalaryStatus(filter: 'paid' | 'hold' = 'paid'): void {
    this.salaryStatusFilter  = filter;
    this.showSalaryStatusModal = true;
  }

  closeSalaryStatus(): void { this.showSalaryStatusModal = false; }

  getSlipsByStatus(status: 'PAID' | 'HOLD'): SalarySlipView[] {
    return this.salarySlips.filter(s => s.status === status);
  }

  getRoleForStaff(staffId: string): string {
    return this.staffDirectory.find(s => s.id === staffId)?.role || '—';
  }

  // ============= ACTIONS =============

  onGenerateSlip(): void {
    if (!this.previewSlip) return;
    if (this.standalone) {
      // Standalone: call service directly, then reload
      this.payrollSvc.generateSalarySlip({
        employeeId: this.previewSlip.staffId,
        month: this.previewSlip.month,
        basicSalary: this.previewSlip.basicSalary,
        hra: this.previewSlip.hra,
        shiftAllowance: this.previewSlip.shiftAllowance,
        leaveDeductions: this.previewSlip.leaveDeductions,
        commission: this.previewSlip.commission,
        bonus: this.previewSlip.bonus,
        pf: this.previewSlip.pf,
        tax: this.previewSlip.tax
      } as any).pipe(takeUntil(this.destroy$)).subscribe(() => this.loadPayrollData());
    } else {
      this.generateSlip.emit(this.previewSlip);
    }
    this.selectedStaffId = '';
    this.previewSlip = null;
  }

  onDownloadSlip(id: string): void {
    if (this.standalone) this.payrollSvc.downloadSalarySlip(id);
    else this.downloadSlip.emit(id);
  }

  onEmailSlip(id: string): void {
    if (this.standalone) this.payrollSvc.emailSalarySlip(id);
    else this.emailSlip.emit(id);
  }

  onPayCommission(id: string): void {
    if (this.standalone) {
      const record = this.commissionRecords.find(c => c.id === id);
      if (!record) return;
      this.payrollSvc.markCommissionPaid(record as CommissionRecord)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.loadPayrollData());
    } else {
      this.payCommission.emit(id);
    }
  }

  onCalculatorChange(): void {
    this.calculator.commission = Math.round(this.calculator.salesAmount * this.calculator.rate / 100);
    this.calculatorChange.emit({ salesAmount: this.calculator.salesAmount, rate: this.calculator.rate });
  }

  onStaffChange(value: string): void {
    this.selectedStaffId = value;
    this.selectedStaffChange.emit(value);
    this.calculatePreview();
  }

  onMonthChange(value: string): void {
    this.selectedMonth = value;
    this.selectedMonthChange.emit(value);
    if (this.standalone) {
      this.loadPayrollData();
    } else {
      this.calculatePreview();
    }
  }
}
