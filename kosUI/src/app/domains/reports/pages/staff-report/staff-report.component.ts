import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { StaffService, StaffMember } from '../../../staff/services/staff.service';
import { AttendanceService } from '../../../staff/services/attendance.service';
import { PayrollService } from '../../../staff/services/payroll.service';
import { ReportFilterComponent } from '../../shared/report-filter/report-filter.component';
import { ExportButtonComponent } from '../../shared/export-button/export-button.component';
import { ReportExportConfig } from '../../shared/report-export.service';

@Component({
  selector: 'app-staff-report',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ReportFilterComponent, ExportButtonComponent],
  templateUrl: './staff-report.component.html',
  styleUrls: ['./staff-report.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffReportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ranges = ['Today', 'Week', 'Month', 'Year'];
  activeRange = 'Week';
  searchText = '';
  sortCol = 'orders';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 1;
  pageSize = 5;
  filterConfig = { showBranch: true, showStaff: true };

  stats: any[] = [];
  topPerformers: any[] = [];
  attendance: any[] = [];
  donutData: any[] = [];
  donutTotal = '0';
  lineData: { x: number; y: number; label: string }[] = [];
  linePoints = '';
  lineAreaPath = '';
  insights: any[] = [];
  alerts: any[] = [];

  constructor(
    private staffSvc: StaffService,
    private attendanceSvc: AttendanceService,
    private payrollSvc: PayrollService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.staffSvc.getStaff().pipe(
      takeUntil(this.destroy$),
      switchMap(staff => {
        this.computeTopPerformers(staff);
        return this.attendanceSvc.getAttendanceForDate(new Date());
      })
    ).subscribe(attendanceRecords => {
      const staffList = this.staffSvc['staffSubject']?.getValue() || [];
      this.computeStats(staffList, attendanceRecords);
      this.computeAttendanceGrid(attendanceRecords);
      this.computeLineChart(attendanceRecords);
      this.computeInsights(staffList, attendanceRecords);
      this.cdr.markForCheck();
    });
  }

  private computeStats(staff: StaffMember[], attendance: any[]) {
    const total = staff.length;
    const present = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const onLeave = attendance.filter(a => a.status === 'ON_LEAVE').length;
    const activeStaff = staff.filter(s => s.status === 'ACTIVE').length;
    const activeRate = total > 0 ? Math.round((activeStaff / total) * 100) : 0;

    this.stats = [
      { value: total.toString(),        label: 'TOTAL STAFF',   delta: '+2 ↑',   up: true, color: 'blue'  },
      { value: present.toString(),      label: 'PRESENT TODAY', delta: 'same →', up: true, color: 'green' },
      { value: onLeave.toString(),      label: 'ON LEAVE',      delta: '-1 ↓',   up: true, color: 'amber' },
      { value: activeRate + '%',        label: 'ACTIVE RATE',   delta: '+4% ↑',  up: true, color: 'green' }
    ];

    this.donutData = this.buildDonut([
      { label: 'Present',  value: present  || 1, color: '#16a34a' },
      { label: 'On Leave', value: onLeave  || 1, color: '#d97706' },
      { label: 'Absent',   value: Math.max(total - present - onLeave, 0) || 1, color: '#dc2626' }
    ]);
    this.donutTotal = total.toString();
  }

  private computeTopPerformers(staff: StaffMember[]) {
    this.topPerformers = staff.slice(0, 10).map(s => ({
      name: s.name,
      role: s.roleName,
      orders: Math.floor(Math.random() * 100) + 50,
      revenue: '₹' + (Math.floor(Math.random() * 20000) + 10000).toLocaleString('en-IN'),
      rating: (4 + Math.random()).toFixed(1),
      status: s.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      statusClass: s.status === 'ACTIVE' ? 'badge-green' : 'badge-red'
    }));
    if (!this.topPerformers.length) {
      this.topPerformers = [{ name: 'No staff', role: '—', orders: 0, revenue: '₹0', rating: '0.0', status: 'INACTIVE', statusClass: 'badge-red' }];
    }
  }

  private computeAttendanceGrid(records: any[]) {
    this.attendance = records.slice(0, 8).map(r => ({
      name: r.staffName.split(' ')[0],
      mon: r.status === 'PRESENT' ? 'P' : r.status === 'ABSENT' ? 'A' : 'L',
      tue: 'P',
      wed: r.status === 'ABSENT' ? 'A' : 'P',
      thu: 'P',
      fri: r.status === 'ON_LEAVE' ? 'L' : 'P',
      sat: 'P',
      hours: r.totalHours * 6 || 48
    }));
  }

  private computeLineChart(records: any[]) {
    const totalHours = records.reduce((s, r) => s + (r.totalHours || 0), 0);
    const base = totalHours || 100;
    const vals = [0.82, 0.88, 0.76, 0.92, 0.87, 0.85, 0.79].map(f => Math.round(base * f));
    this.lineData = this.buildLine(vals.map(v => v || 1), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  }

  private computeInsights(staff: StaffMember[], attendance: any[]) {
    const total = staff.length;
    const present = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
    const lateCount = attendance.filter(a => a.status === 'LATE').length;
    const topPerformer = this.topPerformers[0];

    this.insights = [
      { icon: 'emoji_events',  text: topPerformer ? `Top performer: ${topPerformer.name}` : 'No data yet',  type: 'up'   },
      { icon: 'check_circle',  text: `Attendance rate: ${attendanceRate}% today`,                            type: attendanceRate >= 80 ? 'up' : 'down' },
      { icon: 'schedule',      text: `${lateCount} staff arrived late today`,                                type: lateCount > 2 ? 'warn' : 'info' },
      { icon: 'groups',        text: `${total} total staff — ${staff.filter(s => s.status === 'ACTIVE').length} active`, type: 'info' }
    ];
    this.alerts = [];
    if (present < total * 0.7) {
      this.alerts.push({ icon: 'event_busy', text: `Low attendance today (${attendanceRate}%) — check coverage`, type: 'warn' });
    }
  }

  buildDonut(items: { label: string; value: number; color: string }[]) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    let offset = 0;
    return items.map(i => {
      const pct = (i.value / total) * 100;
      const seg = { ...i, pct, offset };
      offset += pct;
      return seg;
    });
  }

  buildLine(values: number[], labels: string[]) {
    const max = Math.max(...values) || 1;
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * 192 + 4,
      y: 76 - (v / max) * 64,
      label: labels[i]
    }));
    this.linePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
    this.lineAreaPath = `M${pts[0].x},76 ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},76 Z`;
    return pts;
  }

  getDayClass(val: string): string {
    if (val === 'P') return 'badge-green';
    if (val === 'A') return 'badge-red';
    return 'badge-amber';
  }

  get filteredStaff() {
    let data = [...this.topPerformers];
    if (this.searchText) {
      const q = this.searchText.toLowerCase();
      data = data.filter(s => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const v = this.sortCol === 'orders' ? a.orders - b.orders :
                this.sortCol === 'rating' ? parseFloat(a.rating) - parseFloat(b.rating) :
                a.name.localeCompare(b.name);
      return this.sortDir === 'asc' ? v : -v;
    });
    return data;
  }

  get pagedStaff() {
    return this.filteredStaff.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredStaff.length / this.pageSize));
  }

  get pages() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  sort(col: string) {
    if (this.sortCol === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortCol = col;
      this.sortDir = 'asc';
    }
    this.page = 1;
  }

  minVal(a: number, b: number) { return Math.min(a, b); }

  onFilterChange(f: any) { console.log('Filter:', f); }

  get exportConfig(): ReportExportConfig {
    const today = new Date().toLocaleDateString('en-IN');
    return {
      reportName: 'Staff Report',
      restaurant: 'My Restaurant',
      branch: 'All Branches',
      dateRange: { from: '01 Mar 2026', to: today },
      generatedBy: 'Admin',
      stats: this.stats.map(s => ({ metric: s.label, value: s.value, change: s.delta, positive: s.up })),
      insights: this.insights.map(i => i.text),
      alerts: this.alerts.map(a => a.text),
      tables: [
        {
          sheetName: 'Staff Attendance',
          title: 'Staff Attendance \u2013 Today',
          headers: ['Staff', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Hours'],
          rows: this.attendance.map(r => [r.name, r.mon, r.tue, r.wed, r.thu, r.fri, r.sat, r.hours])
        },
        {
          sheetName: 'Attendance Summary',
          title: 'Attendance Summary',
          headers: ['Status', 'Count'],
          rows: this.donutData.map(d => [d.label, Math.round(d.pct) + '%'])
        }
      ]
    };
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
