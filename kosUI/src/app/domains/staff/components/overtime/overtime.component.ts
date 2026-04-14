import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export interface OvertimeRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  regularHours: number;
  totalHours: number;
  overtimeHours: number;
  overtimeRate: number;
  overtimePay: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  notes?: string;
}

@Component({
  selector: 'app-overtime',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './overtime.component.html',
  styleUrls: ['./overtime.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OvertimeComponent implements OnInit {

  records: OvertimeRecord[] = [];
  employees: any[] = [];
  loading = true;
  error   = '';

  filterMonth = new Date().toISOString().substring(0, 7);
  filterStatus = '';
  showModal = false;
  saving = false;

  form = {
    employeeId: 0, date: new Date().toISOString().split('T')[0],
    regularHours: 8, totalHours: 0, overtimeRate: 1.5, notes: ''
  };

  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;
  private readonly ATT = `${EMPLOYEE_MGMT_URL}/api/attendance`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.EMP).pipe(catchError(() => of([]))).subscribe(e => {
      this.employees = e;
      this.cdr.markForCheck();
    });
    this.loadFromAttendance();
  }

  loadFromAttendance(): void {
    this.loading = true;
    // Derive overtime from attendance records: totalHours > regularHours
    const [yr, mo] = this.filterMonth.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const requests = Array.from({ length: daysInMonth }, (_, i) => {
      const d = `${this.filterMonth}-${String(i + 1).padStart(2, '0')}`;
      return this.http.get<any[]>(`${this.ATT}/date/${d}`).pipe(catchError(() => of([])));
    });

    Promise.all(requests.map(r => r.toPromise())).then(results => {
      const derived: OvertimeRecord[] = [];
      results.forEach(dayRecords => {
        (dayRecords ?? []).forEach((a: any) => {
          const totalHrs = a.totalHours ?? 0;
          const regularHrs = 8;
          if (totalHrs > regularHrs) {
            const otHrs = +(totalHrs - regularHrs).toFixed(2);
            const rate = 1.5;
            const hourlySalary = 150; // placeholder ₹/hr
            derived.push({
              id:            a.id,
              employeeId:    a.employeeId,
              employeeName:  a.employeeName ?? `Employee #${a.employeeId}`,
              date:          a.date,
              regularHours:  regularHrs,
              totalHours:    totalHrs,
              overtimeHours: otHrs,
              overtimeRate:  rate,
              overtimePay:   +(otHrs * rate * hourlySalary).toFixed(2),
              status:        'PENDING',
              notes:         a.notes
            });
          }
        });
      });
      this.records = derived;
      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  get filtered(): OvertimeRecord[] {
    return this.filterStatus
      ? this.records.filter(r => r.status === this.filterStatus)
      : this.records;
  }

  get totalOTHours(): number { return this.records.reduce((s, r) => s + r.overtimeHours, 0); }
  get totalOTPay(): number   { return this.records.reduce((s, r) => s + r.overtimePay, 0); }

  computedOT(): number {
    const ot = Math.max(0, this.form.totalHours - this.form.regularHours);
    return +(ot * this.form.overtimeRate * 150).toFixed(2);
  }

  approve(r: OvertimeRecord): void { r.status = 'APPROVED'; this.cdr.markForCheck(); }
  reject(r: OvertimeRecord): void  { r.status = 'REJECTED'; this.cdr.markForCheck(); }
  markPaid(r: OvertimeRecord): void { r.status = 'PAID'; this.cdr.markForCheck(); }

  statusClass(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'badge-warn', APPROVED: 'badge-info', PAID: 'badge-ok', REJECTED: 'badge-err'
    };
    return m[s] ?? 'badge-warn';
  }
}
