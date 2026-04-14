import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export type AdvanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type AdvanceType   = 'SALARY_ADVANCE' | 'LOAN' | 'EMERGENCY';

export interface AdvanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  type: AdvanceType;
  amount: number;
  reason: string;
  requestDate: string;
  status: AdvanceStatus;
  approvedBy?: string;
  disbursedDate?: string;
  repayMonths: number;
  repaidAmount: number;
  emiAmount: number;
  remainingAmount: number;
  notes?: string;
}

@Component({
  selector: 'app-salary-advance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary-advance.component.html',
  styleUrls: ['./salary-advance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalaryAdvanceComponent implements OnInit {

  records: AdvanceRecord[] = [];
  employees: any[] = [];
  filterStatus = '';
  filterType   = '';
  showModal    = false;
  detailRecord: AdvanceRecord | null = null;
  saving = false;
  error  = '';

  form = {
    employeeId: 0, type: 'SALARY_ADVANCE' as AdvanceType,
    amount: 0, repayMonths: 3, reason: '', notes: ''
  };

  private nextId = 100;
  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.EMP).pipe(catchError(() => of([]))).subscribe(e => {
      this.employees = e;
      this.cdr.markForCheck();
    });
    this.seedData();
  }

  private seedData(): void {
    this.records = [
      { id: 1, employeeId: 1, employeeName: 'Arjun Kumar',   type: 'SALARY_ADVANCE', amount: 10000, reason: 'Medical emergency',   requestDate: '2026-03-10', status: 'DISBURSED', approvedBy: 'Manager', disbursedDate: '2026-03-12', repayMonths: 3, repaidAmount: 3333,  emiAmount: 3333,  remainingAmount: 6667 },
      { id: 2, employeeId: 2, employeeName: 'Priya Sharma',  type: 'LOAN',           amount: 25000, reason: 'Home renovation',     requestDate: '2026-03-15', status: 'APPROVED', approvedBy: 'Manager',                              repayMonths: 6, repaidAmount: 0,     emiAmount: 4167,  remainingAmount: 25000 },
      { id: 3, employeeId: 3, employeeName: 'Ravi Patel',    type: 'EMERGENCY',      amount: 5000,  reason: 'Family emergency',    requestDate: '2026-04-01', status: 'PENDING',                                                       repayMonths: 2, repaidAmount: 0,     emiAmount: 2500,  remainingAmount: 5000 },
      { id: 4, employeeId: 4, employeeName: 'Sunita Verma',  type: 'SALARY_ADVANCE', amount: 8000,  reason: 'Child school fees',   requestDate: '2026-02-20', status: 'CLOSED',  approvedBy: 'Manager', disbursedDate: '2026-02-22', repayMonths: 2, repaidAmount: 8000,  emiAmount: 4000,  remainingAmount: 0 },
      { id: 5, employeeId: 5, employeeName: 'Mohan Das',     type: 'LOAN',           amount: 15000, reason: 'Vehicle purchase',    requestDate: '2026-03-25', status: 'REJECTED',                                                      repayMonths: 5, repaidAmount: 0,     emiAmount: 3000,  remainingAmount: 15000 },
    ];
    this.cdr.markForCheck();
  }

  get filtered(): AdvanceRecord[] {
    return this.records.filter(r =>
      (!this.filterStatus || r.status === this.filterStatus) &&
      (!this.filterType   || r.type   === this.filterType)
    );
  }

  get totalDisbursed(): number  { return this.records.filter(r => r.status !== 'REJECTED').reduce((s, r) => s + r.amount, 0); }
  get totalOutstanding(): number { return this.records.filter(r => r.status === 'DISBURSED').reduce((s, r) => s + r.remainingAmount, 0); }
  get pendingCount(): number    { return this.records.filter(r => r.status === 'PENDING').length; }

  openAdd(): void {
    this.form = { employeeId: 0, type: 'SALARY_ADVANCE', amount: 0, repayMonths: 3, reason: '', notes: '' };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.employeeId || !this.form.amount || !this.form.reason) return;
    const emp = this.employees.find(e => e.id === this.form.employeeId);
    const emi = +(this.form.amount / this.form.repayMonths).toFixed(2);
    this.records.unshift({
      id: this.nextId++,
      employeeId:      this.form.employeeId,
      employeeName:    emp?.name ?? `Employee #${this.form.employeeId}`,
      type:            this.form.type,
      amount:          this.form.amount,
      reason:          this.form.reason,
      requestDate:     new Date().toISOString().split('T')[0],
      status:          'PENDING',
      repayMonths:     this.form.repayMonths,
      repaidAmount:    0,
      emiAmount:       emi,
      remainingAmount: this.form.amount,
      notes:           this.form.notes
    });
    this.showModal = false;
    this.cdr.markForCheck();
  }

  approve(r: AdvanceRecord): void {
    r.status = 'APPROVED'; r.approvedBy = 'Manager';
    this.cdr.markForCheck();
  }
  reject(r: AdvanceRecord): void  { r.status = 'REJECTED'; this.cdr.markForCheck(); }
  disburse(r: AdvanceRecord): void {
    r.status = 'DISBURSED'; r.disbursedDate = new Date().toISOString().split('T')[0];
    this.cdr.markForCheck();
  }

  recordEmi(r: AdvanceRecord): void {
    r.repaidAmount    = +(r.repaidAmount + r.emiAmount);
    r.remainingAmount = Math.max(0, r.amount - r.repaidAmount);
    if (r.remainingAmount === 0) r.status = 'CLOSED';
    this.cdr.markForCheck();
  }

  openDetail(r: AdvanceRecord): void { this.detailRecord = r; this.cdr.markForCheck(); }

  typeLabel(t: string): string {
    return t === 'SALARY_ADVANCE' ? 'Advance' : t === 'LOAN' ? 'Loan' : 'Emergency';
  }

  statusClass(s: string): string {
    const m: Record<string,string> = {
      PENDING: 'badge-warn', APPROVED: 'badge-info', DISBURSED: 'badge-ok',
      CLOSED: 'badge-muted', REJECTED: 'badge-err'
    };
    return m[s] ?? 'badge-warn';
  }
}
