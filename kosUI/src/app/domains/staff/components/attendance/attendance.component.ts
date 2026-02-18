import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE';

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

// ─── Mock Session ─────────────────────────────────────────────────────────────
// Simulates what AuthService / RoleService would return.
// To wire real services:
//   1. constructor(private auth: AuthService, private role: RoleService) {}
//   2. In resolveSession():
//      this.currentStaffId   = this.auth.currentUser.staffId;
//      this.currentStaffName = this.auth.currentUser.name;
//      this.hasManagerAccess = this.role.hasRole(['MANAGER', 'ADMIN']);
//   3. Delete MOCK_SESSION and MOCK_* constants below.

const MOCK_SESSION = {
  staffId:   'S001',
  staffName: 'Arjun Mehta',
  role:      'MANAGER' as 'EMPLOYEE' | 'MANAGER' | 'ADMIN'
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_RECORDS: AttendanceRecordView[] = [
  {
    id: 'a1', staffId: 'S001', staffName: 'Arjun Mehta',
    date: new Date(), clockIn: '09:02', clockOut: '18:05',
    status: 'PRESENT', totalHours: 9.05, notes: ''
  },
  {
    id: 'a2', staffId: 'S002', staffName: 'Priya Sharma',
    date: new Date(), clockIn: '09:45', clockOut: '18:00',
    status: 'LATE', totalHours: 8.25, notes: 'Traffic delay'
  },
  {
    id: 'a3', staffId: 'S003', staffName: 'Rahul Nair',
    date: new Date(), clockIn: null, clockOut: null,
    status: 'ABSENT', totalHours: 0, notes: 'No show'
  },
  {
    id: 'a4', staffId: 'S004', staffName: 'Sneha Patil',
    date: new Date(), clockIn: '09:00', clockOut: '13:00',
    status: 'HALF_DAY', totalHours: 4, notes: 'Doctor appointment'
  },
  {
    id: 'a5', staffId: 'S005', staffName: 'Kiran Das',
    date: new Date(), clockIn: null, clockOut: null,
    status: 'ON_LEAVE', totalHours: 0, notes: 'Approved CL'
  },
  {
    id: 'a6', staffId: 'S006', staffName: 'Meera Iyer',
    date: new Date(), clockIn: '08:55', clockOut: '18:10',
    status: 'PRESENT', totalHours: 9.25, notes: ''
  },
  {
    id: 'a7', staffId: 'S007', staffName: 'Vijay Kumar',
    date: new Date(), clockIn: '10:15', clockOut: '18:00',
    status: 'LATE', totalHours: 7.75, notes: 'Bike breakdown'
  }
];

const MOCK_KPI: AttendanceKpi = { present: 3, absent: 1, late: 2, onLeave: 1 };

// Legacy: kept for any external bindings; modal now iterates records directly.
const MOCK_STAFF_IDS: string[] = ['S001', 'S002', 'S003', 'S004', 'S005', 'S006', 'S007'];

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent implements OnInit {

  // ── Inputs ──────────────────────────────────────────────────────────────
  @Input() records: AttendanceRecordView[] = [];
  @Input() kpi!: AttendanceKpi;
  @Input() selectedDate!: Date;
  @Input() loading = false;
  @Input() errorMessage: string | null = null;

  // ── Outputs ─────────────────────────────────────────────────────────────
  @Output() dateChange     = new EventEmitter<Date>();
  @Output() markAttendance = new EventEmitter<{ staffId: string; status: AttendanceStatus }>();
  @Output() clockOut       = new EventEmitter<string>();
  @Output() viewDetails    = new EventEmitter<AttendanceRecordView>();

  // ── Role / Session ───────────────────────────────────────────────────────
  /** Resolved from session in ngOnInit. Never set via @Input(). */
  hasManagerAccess = false;
  currentStaffId   = '';
  currentStaffName = '';

  // ── View State ───────────────────────────────────────────────────────────
  /** Always opens as 'employee'. Switches to 'manager' only on explicit user action + role check. */
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

  readonly staffIds = MOCK_STAFF_IDS;

  calendarDays: Array<{ date: Date; status: AttendanceStatus | null }> = [];

  // ── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.resolveSession();               // Step 1: identity + role
    this.viewMode = 'employee';          // Step 2: always open employee view

    if (!this.selectedDate) {
      this.selectedDate = new Date();    // Step 3: default to today
    }
    if (!this.records || this.records.length === 0) {
      this.records = MOCK_RECORDS;       // Step 4: seed mock if no parent data
    }
    if (!this.kpi) {
      this.kpi = MOCK_KPI;
    }

    this.buildCalendar();
  }

  /**
   * Resolves identity and role from session.
   * Currently uses MOCK_SESSION — swap body for real service when ready.
   */
  private resolveSession(): void {
    // ── Mock (safe default) ──────────────────────────────────────────────
    this.currentStaffId   = MOCK_SESSION.staffId;
    this.currentStaffName = MOCK_SESSION.staffName;
    this.hasManagerAccess = MOCK_SESSION.role === 'MANAGER' || MOCK_SESSION.role === 'ADMIN';

    // ── Real service (uncomment when AuthService is available) ───────────
    // this.currentStaffId   = this.auth.currentUser.staffId;
    // this.currentStaffName = this.auth.currentUser.name;
    // this.hasManagerAccess = this.role.hasRole(['MANAGER', 'ADMIN']);
  }

  // ── View Toggle ──────────────────────────────────────────────────────────
  switchToManager(): void {
    if (!this.hasManagerAccess) return;  // TS guard — HTML *ngIf is secondary
    this.viewMode = 'manager';
  }

  switchToEmployee(): void {
    this.viewMode = 'employee';
  }

  // ── Filtered Records ─────────────────────────────────────────────────────
  get filteredRecords(): AttendanceRecordView[] {
    let list = this.viewMode === 'employee'
      ? this.records.filter(r => r.staffId === this.currentStaffId)
      : [...this.records];

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
      this.dateChange.emit(next);
      this.buildCalendar();
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
      staffId: record?.staffId ?? '',
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
    this.onMarkAttendance(this.markForm.staffId, this.markForm.status);
    const rec = this.records.find(r => r.staffId === this.markForm.staffId);
    if (rec) {
      rec.status = this.markForm.status;
      rec.notes  = this.markForm.notes;
    }
    this.recalcKpi();
    this.closeMarkModal();
  }

  // ── Detail Modal ─────────────────────────────────────────────────────────
  openDetailModal(record: AttendanceRecordView): void {
    this.selectedRecord = record;
    this.showDetailModal = true;
    this.onViewDetails(record);
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedRecord  = null;
  }

  /**
   * Opens mark modal from within the detail modal.
   * Closes detail first, then opens mark on next tick to prevent flicker.
   */
  onEditFromDetail(): void {
    const rec = this.selectedRecord;
    this.closeDetailModal();
    setTimeout(() => this.openMarkModal(rec ?? undefined), 50);
  }

  // ── Clock Out ────────────────────────────────────────────────────────────
  handleClockOut(staffId: string): void {
    const now  = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const rec  = this.records.find(r => r.staffId === staffId);
    if (rec) rec.clockOut = time;
    this.onClockOut(staffId);
  }

  // ── Calendar ─────────────────────────────────────────────────────────────
  buildCalendar(): void {
    const year        = this.selectedDate.getFullYear();
    const month       = this.selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const fakeStatuses: AttendanceStatus[] = [
      'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'ON_LEAVE'
    ];
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => ({
      date:   new Date(year, month, i + 1),
      status: fakeStatuses[i % fakeStatuses.length]
    }));
  }

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

  /**
   * Returns a fixed-length array for calendar offset slots.
   * Replaces [].constructor(n) in templates to avoid strict-mode warnings.
   */
  getOffsetArray(): number[] {
    return Array(this.getCalendarStartOffset()).fill(0);
  }

  // ── Emitters ─────────────────────────────────────────────────────────────
  onMarkAttendance(staffId: string, status: AttendanceStatus): void {
    this.markAttendance.emit({ staffId, status });
  }

  onClockOut(staffId: string): void {
    this.clockOut.emit(staffId);
  }

  onViewDetails(record: AttendanceRecordView): void {
    this.viewDetails.emit(record);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
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

  recalcKpi(): void {
    this.kpi = {
      present: this.records.filter(r => r.status === 'PRESENT').length,
      absent:  this.records.filter(r => r.status === 'ABSENT').length,
      late:    this.records.filter(r => r.status === 'LATE').length,
      onLeave: this.records.filter(r => r.status === 'ON_LEAVE').length
    };
  }

  trackByRecordId(_: number, record: AttendanceRecordView): string {
    return record.id;
  }

  isEmpty(): boolean {
    return !this.loading && (!this.records || this.records.length === 0);
  }
}
