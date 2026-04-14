import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

interface KpiCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  route?: string;
}

interface RecentLeave {
  employeeName: string;
  type: string;
  startDate: string;
  status: string;
}

interface DeptStat {
  name: string;
  count: number;
}

@Component({
  selector: 'app-em-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './em-dashboard.component.html',
  styleUrls: ['./em-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmDashboardComponent implements OnInit {

  kpis: KpiCard[] = [];
  pendingLeaves: RecentLeave[] = [];
  deptStats: DeptStat[] = [];
  loading = true;
  today = new Date();

  private readonly EM = EMPLOYEE_MGMT_URL;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const todayStr = this.today.toISOString().split('T')[0];

    forkJoin({
      employees:  this.http.get<any[]>(`${this.EM}/api/employees`).pipe(catchError(() => of([]))),
      attendance: this.http.get<any[]>(`${this.EM}/api/attendance/date/${todayStr}`).pipe(catchError(() => of([]))),
      leaves:     this.http.get<any[]>(`${this.EM}/api/leaves`).pipe(catchError(() => of([]))),
      depts:      this.http.get<any[]>(`${this.EM}/api/departments`).pipe(catchError(() => of([]))),
      slips:      this.http.get<any[]>(`${this.EM}/api/payroll/salary-slips`).pipe(catchError(() => of([]))),
    }).subscribe(({ employees, attendance, leaves, depts, slips }) => {

      const active     = employees.filter((e: any) => e.status === 'ACTIVE').length;
      const present    = attendance.filter((a: any) => a.status === 'PRESENT').length;
      const onLeave    = attendance.filter((a: any) => a.status === 'ON_LEAVE').length;
      const pending    = leaves.filter((l: any) => l.status === 'PENDING').length;
      const thisMonth  = new Date().toISOString().substring(0, 7);
      const unpaidSlips = slips.filter((s: any) => s.status === 'PENDING' && s.month?.startsWith(thisMonth)).length;

      this.kpis = [
        { label: 'Total Employees', value: active,      icon: 'people',               color: '#3b82f6', route: '/staff/directory'  },
        { label: 'Present Today',   value: present,     icon: 'check_circle',          color: '#16a34a', route: '/staff/attendance' },
        { label: 'On Leave Today',  value: onLeave,     icon: 'event_busy',            color: '#f59e0b', route: '/staff/leave'      },
        { label: 'Pending Leaves',  value: pending,     icon: 'pending_actions',       color: '#ef4444', route: '/staff/leave'      },
        { label: 'Departments',     value: depts.length, icon: 'corporate_fare',       color: '#8b5cf6', route: '/staff/departments'},
        { label: 'Unpaid Slips',    value: unpaidSlips, icon: 'account_balance_wallet', color: '#0891b2', route: '/staff/salary'    },
      ];

      this.pendingLeaves = leaves
        .filter((l: any) => l.status === 'PENDING')
        .slice(0, 5)
        .map((l: any) => ({
          employeeName: l.employeeName ?? `Employee #${l.employeeId}`,
          type:         l.leaveType ?? l.type ?? 'Leave',
          startDate:    l.startDate,
          status:       l.status
        }));

      // department headcount
      const deptMap: Record<number, number> = {};
      employees.forEach((e: any) => {
        if (e.departmentId) deptMap[e.departmentId] = (deptMap[e.departmentId] ?? 0) + 1;
      });
      this.deptStats = depts.map((d: any) => ({
        name:  d.name,
        count: deptMap[d.id] ?? 0
      }));

      this.loading = false;
      this.cdr.markForCheck();
    });
  }

  get totalEmployees(): number {
    return +(this.kpis[0]?.value ?? 0);
  }

  statusClass(status: string): string {
    return status === 'PENDING' ? 'badge-warn' : status === 'APPROVED' ? 'badge-ok' : 'badge-err';
  }
}
