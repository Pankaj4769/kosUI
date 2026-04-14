import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { StaffService, StaffMember } from '../../services/staff.service';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceStatus } from '../../models/attendance.model';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ViewMode = 'employee' | 'manager';

export interface AttendanceRecordView {
  id: string;
  staffId: string;
  staffName: string;
  date: Date;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  totalHours: number;
  notes?: string;
}

export interface AttendanceKpi {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Data ─────────────────────────────────────────────────────────────────
  records: AttendanceRecordView[] = [];
  kpi: AttendanceKpi = { present: 0, absent: 0, late: 0, onLeave: 0 };
  selectedDate: Date = new Date();
  loading = false;
  errorMessage: string | null = null;

  // ── Session ──────────────────────────────────────────────────────────────
  hasManagerAccess = false;
  currentStaffId   = '';   // EM employee id
  currentStaffName = '';
  staffMembers: StaffMember[] = [];   // all staff (for dropdown)

  // ── View State ───────────────────────────────────────────────────────────
  viewMode: ViewMode = 'employee';
  statusFilter: AttendanceStatus | 'ALL' = 'ALL';
  searchQuery = '';

  showMarkModal   = false;
  showDetailModal = false;
  selectedRecord: AttendanceRecordView | null = null;

  markForm: { staffId: string; status: AttendanceStatus; notes: string } = {
    staffId: '', status: 'PRESENT', notes: ''
  };

  readonly statusOptions: Array<AttendanceStatus | 'ALL'> = [
    'ALL', 'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'
  ];

  readonly allStatusValues: AttendanceStatus[] = [
    'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'
  ];

  calendarDays: Array<{ date: Date; status: AttendanceStatus | null }> = [];

  // ── Lifecycle ────────────────────────────────────────────────────────────
  constructor(
    private auth: AuthService,
    private staffSvc: StaffService,
    private attendanceSvc: AttendanceService
  ) {}

  ngOnInit(): void {
    this.resolveSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Session ──────────────────────────────────────────────────────────────
  private resolveSession(): void {
    const user = this.auth.currentUser;
    if (!user) return;

    this.currentStaffName = user.name;
    const kosRole = user.role;
    this.hasManagerAccess = kosRole === 'OWNER' || kosRole === 'MANAGER';

    // Find EM employee id (emId) for this user via StaffService
    const restaurantId = user.restaurantId ?? '';
    this.staffSvc.loadStaff(restaurantId);
    this.staffSvc.staff$.pipe(takeUntil(this.destroy$)).subscribe(staffList => {
      this.staffMembers = staffList;
      const me = staffList.find(s => s.id === String(user.staffId));
      if (me?.emId) {
        this.currentStaffId = me.emId;
        this.loadAttendance();
        this.loadCalendar();
      } else {
        // No EM record yet — load attendance for manager view if access
        if (this.hasManagerAccess) {
          this.loadAttendance();
        }
      }
    });
  }

  // ── Data Loading ─────────────────────────────────────────────────────────
  loadAttendance(): void {
    this.loading = true;
    this.errorMessage = null;

    const source$ = (this.viewMode === 'manager' || !this.currentStaffId)
      ? this.attendanceSvc.getAttendanceForDate(this.selectedDate)
      : this.attendanceSvc.getAttendanceForEmployee(this.currentStaffId).pipe(
          catchError(() => of([]))
        );

    source$.pipe(
      catchError(() => {
        this.errorMessage = 'Failed to load attendance data.';
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe(records => {
      // In employee view, filter to only the current user's records
      const filtered = (this.viewMode === 'employee' && this.currentStaffId)
        ? records.filter(r => r.staffId === this.currentStaffId)
        : records;
      this.records = filtered.map(r => ({ ...r }));
      this.recalcKpi();
      this.loading = false;
    });
  }

  loadCalendar(): void {
    if (!this.currentStaffId) return;
    const year  = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 0);

    this.attendanceSvc.getAttendanceForEmployeeRange(this.currentStaffId, start, end)
      .pipe(takeUntil(this.destroy$), catchError(() => of([])))
      .subscribe(records => {
        const statusByDay = new Map<string, AttendanceStatus>();
        records.forEach(r => {
          const key = new Date(r.date).toISOString().split('T')[0];
          statusByDay.set(key, r.status);
        });
        const daysInMonth = end.getDate();
        this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(year, month, i + 1);
          return {
            date:   d,
            status: statusByDay.get(d.toISOString().split('T')[0]) ?? null
          };
        });
      });
  }

  // ── View Toggle ──────────────────────────────────────────────────────────
  switchToManager(): void {
    if (!this.hasManagerAccess) return;
    this.viewMode = 'manager';
    this.loadAttendance();
  }

  switchToEmployee(): void {
    this.viewMode = 'employee';
    this.loadAttendance();
  }

  // ── Filtered Records ─────────────────────────────────────────────────────
  get filteredRecords(): AttendanceRecordView[] {
    let list = [...this.records];
    if (this.statusFilter !== 'ALL') {
      list = list.filter(r => r.status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r =>
        r.staffName.toLowerCase().includes(q) ||
        r.staffId.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get myRecord(): AttendanceRecordView | undefined {
    return this.records.find(r => r.staffId === this.currentStaffId);
  }

  // ── Date Handling ────────────────────────────────────────────────────────
  onDateChange(value: string): void {
    if (!value) return;
    const next = new Date(value);
    if (!isNaN(next.getTime())) {
      this.selectedDate = next;
      this.loadAttendance();
      this.loadCalendar();
    }
  }

  get selectedDateIso(): string {
    return this.selectedDate
      ? this.selectedDate.toISOString().substring(0, 10)
      : '';
  }

  // ── Mark Attendance Modal ────────────────────────────────────────────────
  openMarkModal(record?: AttendanceRecordView): void {
    this.markForm = {
      staffId: record?.staffId ?? this.currentStaffId,
      status:  record?.status  ?? 'PRESENT',
      notes:   record?.notes   ?? ''
    };
    this.showMarkModal = true;
  }

  closeMarkModal(): void {
    this.showMarkModal = false;
  }

  submitMarkForm(): void {
    if (!this.markForm.staffId) return;
    this.attendanceSvc.markAttendance(
      this.markForm.staffId,
      this.markForm.status,
      this.selectedDate,
      this.markForm.notes
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.closeMarkModal();
        this.loadAttendance();
        this.loadCalendar();
      },
      error: () => {
        this.errorMessage = 'Failed to mark attendance.';
        this.closeMarkModal();
      }
    });
  }

  // ── Detail Modal ─────────────────────────────────────────────────────────
  openDetailModal(record: AttendanceRecordView): void {
    this.selectedRecord  = record;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedRecord  = null;
  }

  onEditFromDetail(): void {
    const rec = this.selectedRecord;
    this.closeDetailModal();
    setTimeout(() => this.openMarkModal(rec ?? undefined), 50);
  }

  // ── Clock Out ────────────────────────────────────────────────────────────
  handleClockOut(staffId: string): void {
    const record = this.records.find(r => r.staffId === staffId);
    if (!record) return;
    this.attendanceSvc.clockOut(record.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: updated => {
        const idx = this.records.findIndex(r => r.id === record.id);
        if (idx !== -1 && updated.clockOut) {
          this.records[idx].clockOut = updated.clockOut;
        }
      },
      error: () => { this.errorMessage = 'Failed to clock out.'; }
    });
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  get calendarMonthLabel(): string {
    return this.selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  getCalendarStartOffset(): number {
    return new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      1
    ).getDay();
  }

  getOffsetArray(): number[] {
    return Array(this.getCalendarStartOffset()).fill(0);
  }

  // ── Computed ─────────────────────────────────────────────────────────────
  get staffWithEmId(): StaffMember[] {
    return this.staffMembers.filter(s => !!s.emId);
  }

  get hasEmProfile(): boolean {
    return !!this.currentStaffId;
  }

  get unmarkedCount(): number {
    const marked = new Set(this.records.map(r => r.staffId));
    return this.staffWithEmId.filter(s => !marked.has(s.emId!)).length;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  recalcKpi(): void {
    this.kpi = {
      present: this.records.filter(r => r.status === 'PRESENT').length,
      absent:  this.records.filter(r => r.status === 'ABSENT').length,
      late:    this.records.filter(r => r.status === 'LATE').length,
      onLeave: this.records.filter(r => r.status === 'ON_LEAVE').length
    };
  }

  getAttendanceStatusColor(status: AttendanceStatus): string {
    const colors: Record<AttendanceStatus, string> = {
      PRESENT:  '#22c55e',
      ABSENT:   '#ef4444',
      LATE:     '#fbbf24',
      HALF_DAY: '#fb923c',
      ON_LEAVE: '#6366f1'
    };
    return colors[status] || '#999';
  }

  getStatusLabel(status: AttendanceStatus | 'ALL'): string {
    const labels: Record<AttendanceStatus | 'ALL', string> = {
      ALL:      'All',
      PRESENT:  'Present',
      ABSENT:   'Absent',
      LATE:     'Late',
      HALF_DAY: 'Half Day',
      ON_LEAVE: 'On Leave'
    };
    return labels[status] || status;
  }

  getCountByStatus(status: AttendanceStatus | 'ALL'): number {
    if (status === 'ALL') return this.records.length;
    return this.records.filter(r => r.status === status).length;
  }

  trackByRecordId(_: number, record: AttendanceRecordView): string {
    return record.id;
  }

  isEmpty(): boolean {
    return !this.loading && (!this.records || this.records.length === 0);
  }
}
