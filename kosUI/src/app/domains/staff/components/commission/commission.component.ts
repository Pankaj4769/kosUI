import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export interface CommissionRecord {
  id?: number;
  employeeId: number;
  employeeName?: string;
  month: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING' | 'PAID';
  paidDate?: string;
}

interface Employee { id: number; name?: string; }

@Component({
  selector: 'app-commission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commission.component.html',
  styleUrls: ['./commission.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommissionComponent implements OnInit {

  records: CommissionRecord[] = [];
  employees: Employee[] = [];
  loading = true;
  error   = '';

  filterMonth = new Date().toISOString().substring(0, 7);
  showModal   = false;
  saving      = false;

  form = { employeeId: 0, month: this.filterMonth, salesAmount: 0, commissionRate: 5 };

  private readonly API = `${EMPLOYEE_MGMT_URL}/api/payroll/commissions`;
  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<Employee[]>(this.EMP).subscribe({
      next: e => { this.employees = e; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    const url = this.filterMonth
      ? `${this.API}/month/${this.filterMonth}`
      : this.API;
    this.http.get<CommissionRecord[]>(url).subscribe({
      next:  r => { this.records = r; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load commissions.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  get totalCommission(): number {
    return this.records.reduce((s, r) => s + r.commissionAmount, 0);
  }
  get paidCount(): number   { return this.records.filter(r => r.status === 'PAID').length; }
  get pendingCount(): number { return this.records.filter(r => r.status === 'PENDING').length; }

  computedCommission(): number {
    return +(this.form.salesAmount * (this.form.commissionRate / 100)).toFixed(2);
  }

  employeeName(id: number): string {
    return this.employees.find(e => e.id === id)?.name ?? `#${id}`;
  }

  openAdd(): void {
    this.form = { employeeId: 0, month: this.filterMonth, salesAmount: 0, commissionRate: 5 };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.employeeId || !this.form.salesAmount) return;
    this.saving = true;
    const body = { ...this.form, commissionAmount: this.computedCommission() };
    this.http.post<CommissionRecord>(this.API, body).subscribe({
      next:  () => { this.saving = false; this.showModal = false; this.load(); },
      error: () => { this.saving = false; this.error = 'Save failed.'; this.cdr.markForCheck(); }
    });
  }

  markPaid(r: CommissionRecord): void {
    this.http.patch<CommissionRecord>(`${this.API}/${r.id}/pay`, {}).subscribe({
      next:  () => this.load(),
      error: () => { this.error = 'Failed to mark as paid.'; this.cdr.markForCheck(); }
    });
  }

  statusClass(s: string): string { return s === 'PAID' ? 'badge-ok' : 'badge-warn'; }
}
