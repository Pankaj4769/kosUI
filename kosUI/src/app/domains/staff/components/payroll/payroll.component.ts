import { CommonModule } from '@angular/common';
import { 
  Component, 
  EventEmitter, 
  Input, 
  Output, 
  OnInit,       // FIXED: Added OnInit
  OnChanges, 
  SimpleChanges 
} from '@angular/core';
import { FormsModule } from '@angular/forms';

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

// FIXED: Added OnInit to implements
@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.component.html',
  styleUrls: ['./payroll.component.css']
})
export class PayrollComponent implements OnInit, OnChanges {

  // ============= INPUTS =============
  @Input() salarySlips: SalarySlipView[] = [];
  @Input() salaryKpi!: SalaryKpi;
  @Input() commissionRecords: CommissionRecordView[] = [];
  @Input() commissionKpi!: CommissionKpi;

  @Input() selectedMonth: string = new Date().toISOString().slice(0, 7); // FIXED: Default to current month
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

  // FIXED: Properly typed salaryStatusFilter (referenced in HTML)
  salaryStatusFilter: 'paid' | 'hold' = 'paid';

  // FIXED: Properly typed bulkCommissionForm
  bulkCommissionForm: { rate: number; month: string; salesTeam: string[] } = {
    rate: 1.5,
    month: '',
    salesTeam: []
  };

  // ============= CONSTANTS =============
  readonly SHIFT_ALLOWANCE_RATE = 200;   // ₹200 per Night Shift
  readonly NIGHT_SHIFT_KEY = 'Night';
  readonly PAID_LEAVE_LIMIT = 2;         // Free paid leave days per month

  // ============= MOCK DATA (For Testing) =============

  mockStaffDirectory: StaffProfile[] = [
    { id: 'EMP001', name: 'John Doe',     role: 'Chef',       baseSalary: 45000, email: 'john@kitchen.com' },
    { id: 'EMP002', name: 'Jane Smith',   role: 'Sous Chef',  baseSalary: 38000, email: 'jane@kitchen.com' },
    { id: 'EMP003', name: 'Mike Johnson', role: 'Line Cook',  baseSalary: 32000, email: 'mike@kitchen.com' },
    { id: 'EMP004', name: 'Sarah Wilson', role: 'Waiter',     baseSalary: 25000, email: 'sarah@kitchen.com' },
    { id: 'EMP005', name: 'David Brown',  role: 'Bartender',  baseSalary: 28000, email: 'david@kitchen.com' }
  ];

  mockShiftRecords: ShiftRecord[] = [
    { staffId: 'EMP001', date: '2026-02-01', shiftType: 'Night',   isPresent: true },
    { staffId: 'EMP001', date: '2026-02-07', shiftType: 'Night',   isPresent: true },
    { staffId: 'EMP002', date: '2026-02-02', shiftType: 'Night',   isPresent: true },
    { staffId: 'EMP002', date: '2026-02-08', shiftType: 'Morning', isPresent: true },
    { staffId: 'EMP003', date: '2026-02-03', shiftType: 'Night',   isPresent: true },
    { staffId: 'EMP004', date: '2026-02-04', shiftType: 'General', isPresent: true },
    { staffId: 'EMP005', date: '2026-02-05', shiftType: 'Evening', isPresent: true }
  ];

  mockLeaveRecords: LeaveRecord[] = [
    { staffId: 'EMP001', startDate: '2026-02-05', endDate: '2026-02-06', type: 'UNPAID', days: 2 },
    { staffId: 'EMP002', startDate: '2026-02-10', endDate: '2026-02-11', type: 'PAID',   days: 2 },
    { staffId: 'EMP004', startDate: '2026-02-15', endDate: '2026-02-17', type: 'PAID',   days: 3 },
    { staffId: 'EMP003', startDate: '2026-02-20', endDate: '2026-02-20', type: 'SICK',   days: 1 }
  ];

  mockCommissionRecords: CommissionRecordView[] = [
    { id: 'COM001', staffId: 'EMP001', staffName: 'John Doe',     salesAmount: 120000, commissionRate: 1.5, commissionAmount: 1800, month: '2026-02', status: 'PAID',    paidDate: new Date('2026-02-28') },
    { id: 'COM002', staffId: 'EMP002', staffName: 'Jane Smith',   salesAmount: 95000,  commissionRate: 1.5, commissionAmount: 1425, month: '2026-02', status: 'PAID',    paidDate: new Date('2026-02-28') },
    { id: 'COM003', staffId: 'EMP004', staffName: 'Sarah Wilson', salesAmount: 75000,  commissionRate: 1.0, commissionAmount: 750,  month: '2026-02', status: 'PENDING' },
    { id: 'COM004', staffId: 'EMP005', staffName: 'David Brown',  salesAmount: 88000,  commissionRate: 1.0, commissionAmount: 880,  month: '2026-02', status: 'PENDING' }
  ];

  mockSalarySlips: SalarySlipView[] = [
    {
      id: 'SLP001', staffId: 'EMP001', staffName: 'John Doe',
      month: '2026-02', basicSalary: 18000, hra: 9000, shiftAllowance: 400,
      leaveDeductions: 3000, commission: 1800, bonus: 0,
      grossSalary: 47200, pf: 1800, tax: 0, netSalary: 42400,
      status: 'PAID', generatedDate: new Date('2026-02-25'), paymentDate: new Date('2026-02-28')
    },
    {
      id: 'SLP002', staffId: 'EMP002', staffName: 'Jane Smith',
      month: '2026-02', basicSalary: 15200, hra: 7600, shiftAllowance: 200,
      leaveDeductions: 0, commission: 1425, bonus: 0,
      grossSalary: 39625, pf: 1800, tax: 0, netSalary: 37825,
      status: 'PAID', generatedDate: new Date('2026-02-25'), paymentDate: new Date('2026-02-28')
    },
    {
      id: 'SLP003', staffId: 'EMP003', staffName: 'Mike Johnson',
      month: '2026-02', basicSalary: 12800, hra: 6400, shiftAllowance: 200,
      leaveDeductions: 0, commission: 0, bonus: 0,
      grossSalary: 32200, pf: 1536, tax: 0, netSalary: 30664,
      status: 'GENERATED', generatedDate: new Date('2026-02-25')
    },
    {
      id: 'SLP004', staffId: 'EMP004', staffName: 'Sarah Wilson',
      month: '2026-02', basicSalary: 10000, hra: 5000, shiftAllowance: 0,
      leaveDeductions: 833, commission: 0, bonus: 0,
      grossSalary: 25000, pf: 1200, tax: 0, netSalary: 22967,
      status: 'HOLD', generatedDate: new Date('2026-02-25')
    },
    {
      id: 'SLP005', staffId: 'EMP005', staffName: 'David Brown',
      month: '2026-02', basicSalary: 11200, hra: 5600, shiftAllowance: 0,
      leaveDeductions: 0, commission: 0, bonus: 0,
      grossSalary: 28000, pf: 1344, tax: 0, netSalary: 26656,
      status: 'HOLD', generatedDate: new Date('2026-02-25')
    }
  ];

  mockSalaryKpi: SalaryKpi = {
    totalPayroll: 160789,
    thisMonth: 160789,
    processed: 3,
    pending: 2,
    paidCount: 2,
    holdCount: 2
  };

  mockCommissionKpi: CommissionKpi = {
    totalSales: 378000,
    totalCommission: 4855,
    pending: 1630,
    paid: 3225
  };

  // ============= LIFECYCLE =============

  ngOnInit(): void {
    // Load mock data if no real data provided
    if (!this.staffDirectory || this.staffDirectory.length === 0) {
      this.staffDirectory = this.mockStaffDirectory;
    }
    if (!this.shiftRecords || this.shiftRecords.length === 0) {
      this.shiftRecords = this.mockShiftRecords;
    }
    if (!this.leaveRecords || this.leaveRecords.length === 0) {
      this.leaveRecords = this.mockLeaveRecords;
    }
    if (!this.commissionRecords || this.commissionRecords.length === 0) {
      this.commissionRecords = this.mockCommissionRecords;
    }
    if (!this.salarySlips || this.salarySlips.length === 0) {
      this.salarySlips = this.mockSalarySlips;
    }
    if (!this.salaryKpi) {
      this.salaryKpi = this.mockSalaryKpi;
    }
    if (!this.commissionKpi) {
      this.commissionKpi = this.mockCommissionKpi;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recalculate when staff or month selection changes
    if (changes['selectedStaffId'] || changes['selectedMonth']) {
      this.calculatePreview();
    }
  }

  // ============= CALCULATION LOGIC =============

  calculatePreview(): void {
    if (!this.selectedStaffId || !this.selectedMonth) {
      this.previewSlip = null;
      return;
    }

    const staff = this.staffDirectory.find(s => s.id === this.selectedStaffId);
    if (!staff) return;

    // Base Components
    const basic = staff.baseSalary * 0.4;
    const hra = staff.baseSalary * 0.2;

    // Shift Allowance: Count night shifts for this staff in this month
    const nightShifts = this.shiftRecords.filter(s =>
      s.staffId === this.selectedStaffId &&
      s.date.startsWith(this.selectedMonth) &&
      s.shiftType === this.NIGHT_SHIFT_KEY
    );
    const shiftAllowance = nightShifts.length * this.SHIFT_ALLOWANCE_RATE;

    // Leave Deductions
    const staffLeaves = this.leaveRecords.filter(l =>
      l.staffId === this.selectedStaffId &&
      l.startDate.startsWith(this.selectedMonth)
    );

    let unpaidDays = 0;
    let paidDaysTaken = 0;

    staffLeaves.forEach(leave => {
      if (leave.type === 'UNPAID') {
        unpaidDays += leave.days;
      } else if (leave.type === 'PAID') {
        paidDaysTaken += leave.days;
      }
      // SICK leave is always free (no deduction)
    });

    // Excess paid leave treated as unpaid
    if (paidDaysTaken > this.PAID_LEAVE_LIMIT) {
      unpaidDays += (paidDaysTaken - this.PAID_LEAVE_LIMIT);
    }

    const perDaySalary = staff.baseSalary / 30;
    const leaveDeductions = Math.round(unpaidDays * perDaySalary);

    // Commission: Only count already PAID commissions
    const commissions = this.commissionRecords
      .filter(c =>
        c.staffId === this.selectedStaffId &&
        c.month === this.selectedMonth &&
        c.status === 'PAID'
      )
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    // Totals
    const gross = staff.baseSalary + shiftAllowance + commissions;
    const pf = Math.min(basic * 0.12, 1800); // PF capped at ₹1800
    const tax = 0;
    const net = gross - pf - tax - leaveDeductions;

    this.previewSlip = {
      id: `SLIP-${Date.now()}`,
      staffId: staff.id,
      staffName: staff.name,
      month: this.selectedMonth,
      basicSalary: basic,
      hra: hra,
      shiftAllowance: shiftAllowance,
      leaveDeductions: leaveDeductions,
      commission: commissions,
      bonus: 0,
      grossSalary: gross,
      pf: pf,
      tax: tax,
      netSalary: Math.max(0, net), // Prevent negative salary
      status: 'GENERATED',
      generatedDate: new Date()
    };
  }

  // ============= BULK COMMISSION =============

  openBulkCommission(): void {
    this.bulkCommissionForm.month = this.selectedMonth || new Date().toISOString().slice(0, 7);
    this.bulkCommissionForm.rate = 1.5;
    this.showBulkCommissionModal = true;
  }

  confirmBulkCommission(): void {
    this.bulkCommission.emit({
      rate: this.bulkCommissionForm.rate,
      month: this.bulkCommissionForm.month
    });
    this.showBulkCommissionModal = false;
  }

  // Helper: Preview commission amount per staff for bulk modal
  getCommissionForStaff(staff: StaffProfile): number {
    return Math.round(staff.baseSalary * this.bulkCommissionForm.rate / 100);
  }

  // ============= SALARY STATUS MODAL =============

  // FIXED: Accepts filter param to differentiate paid vs hold
  openSalaryStatus(filter: 'paid' | 'hold' = 'paid'): void {
    this.salaryStatusFilter = filter;
    this.showSalaryStatusModal = true;
  }

  closeSalaryStatus(): void {
    this.showSalaryStatusModal = false;
  }

  // Helper: Filter slips by status for modal table
  getSlipsByStatus(status: 'PAID' | 'HOLD'): SalarySlipView[] {
    return this.salarySlips.filter(s => s.status === status);
  }

  // Helper: Lookup role from staffDirectory
  getRoleForStaff(staffId: string): string {
    return this.staffDirectory.find(s => s.id === staffId)?.role || '—';
  }

  // ============= ACTIONS =============

  onGenerateSlip(): void {
    if (this.previewSlip) {
      this.generateSlip.emit(this.previewSlip);
      this.selectedStaffId = '';
      this.previewSlip = null;
    }
  }

  onDownloadSlip(id: string): void { this.downloadSlip.emit(id); }
  onEmailSlip(id: string): void { this.emailSlip.emit(id); }
  onPayCommission(id: string): void { this.payCommission.emit(id); }

  onCalculatorChange(): void {
    this.calculator.commission = Math.round(
      this.calculator.salesAmount * this.calculator.rate / 100
    );
    this.calculatorChange.emit({
      salesAmount: this.calculator.salesAmount,
      rate: this.calculator.rate
    });
  }

  onStaffChange(value: string): void {
    this.selectedStaffId = value;
    this.selectedStaffChange.emit(value);
    this.calculatePreview(); // FIXED: Trigger recalc on inline change
  }

  onMonthChange(value: string): void {
    this.selectedMonth = value;
    this.selectedMonthChange.emit(value);
    this.calculatePreview(); // FIXED: Trigger recalc on inline change
  }
}
