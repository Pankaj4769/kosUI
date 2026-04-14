import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

interface MonthStat { month: string; value: number; }
interface DeptStat  { name: string; count: number; color: string; }
interface KpiCard   { label: string; value: string | number; sub?: string; icon: string; color: string; }

@Component({
  selector: 'app-hr-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-analytics.component.html',
  styleUrls: ['./hr-analytics.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HrAnalyticsComponent implements OnInit {

  loading = true;
  filterYear = new Date().getFullYear();

  kpis: KpiCard[] = [];
  attendanceTrend: MonthStat[] = [];
  leaveTrend: MonthStat[]      = [];
  deptHeadcount: DeptStat[]    = [];
  turnoverTrend: MonthStat[]   = [];
  leaveTypeBreakdown: { type: string; days: number; color: string }[] = [];
  payrollTrend: MonthStat[]    = [];

  private readonly EM = EMPLOYEE_MGMT_URL;
  private readonly MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  private readonly DEPT_COLORS = ['#16a34a','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#0891b2'];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    forkJoin({
      employees:  this.http.get<any[]>(`${this.EM}/api/employees`).pipe(catchError(() => of([]))),
      leaves:     this.http.get<any[]>(`${this.EM}/api/leaves`).pipe(catchError(() => of([]))),
      depts:      this.http.get<any[]>(`${this.EM}/api/departments`).pipe(catchError(() => of([]))),
      slips:      this.http.get<any[]>(`${this.EM}/api/payroll/salary-slips`).pipe(catchError(() => of([]))),
    }).subscribe(({ employees, leaves, depts, slips }) => {

      const active      = employees.filter((e: any) => e.status === 'ACTIVE').length;
      const inactive    = employees.filter((e: any) => e.status === 'INACTIVE' || e.status === 'TERMINATED').length;
      const onLeave     = employees.filter((e: any) => e.status === 'ON_LEAVE').length;
      const avgSalary   = employees.length
        ? Math.round(employees.reduce((s: number, e: any) => s + (e.salary ?? 0), 0) / employees.length)
        : 0;
      const pendingL    = leaves.filter((l: any) => l.status === 'PENDING').length;
      const totalPayroll = slips.filter((s: any) => s.status === 'PAID').reduce((sum: number, s: any) => sum + (s.netSalary ?? s.totalSalary ?? 0), 0);

      this.kpis = [
        { label: 'Active Employees', value: active,    sub: `${inactive} inactive`,      icon: 'people',               color: '#16a34a' },
        { label: 'On Leave Today',   value: onLeave,   sub: `${pendingL} leave pending`,  icon: 'event_busy',            color: '#f59e0b' },
        { label: 'Avg. Salary',      value: `₹${avgSalary.toLocaleString('en-IN')}`, sub: 'per employee', icon: 'account_balance_wallet', color: '#3b82f6' },
        { label: 'Total Payroll',    value: `₹${(totalPayroll/1000).toFixed(0)}K`, sub: 'paid this year', icon: 'payments', color: '#8b5cf6' },
      ];

      // Attendance trend — simulate monthly present % from seed
      this.attendanceTrend = this.MONTHS.slice(0, 4).map((m, i) => ({
        month: m, value: 82 + Math.round(Math.random() * 12)
      }));

      // Leave trend
      const leaveByMonth: Record<string, number> = {};
      leaves.forEach((l: any) => {
        const mo = (l.startDate ?? '').substring(5, 7);
        if (mo) leaveByMonth[mo] = (leaveByMonth[mo] ?? 0) + (l.days ?? 1);
      });
      this.leaveTrend = this.MONTHS.map((m, i) => ({
        month: m, value: leaveByMonth[String(i+1).padStart(2,'0')] ?? 0
      }));

      // Dept headcount
      const deptMap: Record<number, number> = {};
      employees.forEach((e: any) => {
        if (e.departmentId) deptMap[e.departmentId] = (deptMap[e.departmentId] ?? 0) + 1;
      });
      this.deptHeadcount = depts.map((d: any, i: number) => ({
        name:  d.name,
        count: deptMap[d.id] ?? 0,
        color: this.DEPT_COLORS[i % this.DEPT_COLORS.length]
      }));

      // Leave type breakdown
      const typeMap: Record<string, number> = {};
      leaves.forEach((l: any) => {
        const t = l.leaveType ?? l.type ?? 'OTHER';
        typeMap[t] = (typeMap[t] ?? 0) + (l.days ?? 1);
      });
      const typeColors: Record<string,string> = { SICK:'#ef4444', CASUAL:'#3b82f6', EARNED:'#16a34a', UNPAID:'#f59e0b', OTHER:'#94a3b8' };
      this.leaveTypeBreakdown = Object.entries(typeMap).map(([type, days]) => ({
        type, days, color: typeColors[type] ?? '#94a3b8'
      }));

      // Payroll trend
      const payByMonth: Record<string,number> = {};
      slips.forEach((s: any) => {
        const mo = (s.month ?? '').substring(0, 7);
        if (mo) payByMonth[mo] = (payByMonth[mo] ?? 0) + (s.netSalary ?? s.totalSalary ?? 0);
      });
      this.payrollTrend = this.MONTHS.map((m, i) => {
        const key = `${this.filterYear}-${String(i+1).padStart(2,'0')}`;
        return { month: m, value: payByMonth[key] ?? 0 };
      });

      // Turnover — placeholder
      this.turnoverTrend = this.MONTHS.slice(0, 4).map(m => ({
        month: m, value: Math.floor(Math.random() * 2)
      }));

      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  maxVal(arr: MonthStat[]): number { return Math.max(...arr.map(a => a.value), 1); }
  barHeight(val: number, max: number): number { return Math.round((val / max) * 100); }
  deptTotal(): number { return this.deptHeadcount.reduce((s, d) => s + d.count, 0) || 1; }
  totalLeaveDays(): number { return this.leaveTypeBreakdown.reduce((s, l) => s + l.days, 0) || 1; }
}
