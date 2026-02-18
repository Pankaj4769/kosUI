import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// ============= TYPES =============
export type LeaveType   = 'SICK' | 'CASUAL' | 'EARNED' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FilterType  = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type ViewMode    = 'employee' | 'manager';

// ============= INTERFACES =============
export interface LeaveRequestView {
  id: string;
  staffId: string;
  staffName: string;
  role?: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  isHalfDay?: boolean;
  reason: string;
  status: LeaveStatus;
  appliedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
}

export interface LeaveBalance {
  staffId: string;
  staffName: string;
  sick: number;
  casual: number;
  earned: number;
  unpaid: number;
  totalUsed: number;
  totalAllotted: number;
}

export interface LeaveKpi {
  pending: number;
  approved: number;
  rejected: number;
  totalDays: number;
  onLeaveToday?: number;
}

export interface NewLeaveForm {
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason: string;
}

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.css']
})
export class LeaveManagementComponent implements OnInit {

  // ============= INPUTS =============
  @Input() requests: LeaveRequestView[]  = [];
  @Input() kpi!: LeaveKpi;
  @Input() filter: FilterType            = 'ALL';
  @Input() leaveBalances: LeaveBalance[] = [];
  @Input() staffOptions: { id: string; name: string; role: string }[] = [];
  @Input() currentStaffId: string        = 'EMP001';
  @Input() currentStaffName: string      = 'John Doe';
  @Input() currentStaffRole: string      = 'Chef';
  @Input() hasManagerAccess: boolean     = true;

  // ============= OUTPUTS =============
  @Output() filterChange     = new EventEmitter<FilterType>();
  @Output() approve          = new EventEmitter<string>();
  @Output() reject           = new EventEmitter<{ id: string; reason: string }>();
  @Output() openRequestModal = new EventEmitter<void>();
  @Output() submitLeave      = new EventEmitter<NewLeaveForm>();

  // ============= CONSTANTS =============

  // FIX: Typed arrays to avoid NG5 type inference errors in *ngFor
  readonly filterOptions: FilterType[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
  readonly leaveTypeOptions: LeaveType[] = ['SICK', 'CASUAL', 'EARNED', 'UNPAID'];

  readonly leaveTypeColors: Record<LeaveType, string> = {
    SICK:   '#ef4444',
    CASUAL: '#f59e0b',
    EARNED: '#10b981',
    UNPAID: '#6b7280'
  };

  readonly ALLOTMENT: Record<LeaveType, number> = {
    SICK: 12, CASUAL: 8, EARNED: 15, UNPAID: 0
  };

  // ============= STATE =============
  viewMode: ViewMode = 'employee';
  activeTab: 'requests' | 'balances' | 'calendar' = 'requests';
  empTab: 'overview' | 'history' | 'calendar'     = 'overview';
  empHistoryFilter: FilterType = 'ALL';

  showRejectModal     = false;
  rejectTargetId      = '';
  rejectReason        = '';
  showNewRequestModal = false;
  newLeaveForm: NewLeaveForm = this.getEmptyForm();
  showDetailModal     = false;
  selectedRequest: LeaveRequestView | null = null;

  calendarDate  = new Date();
  calendarWeeks: Date[][] = [];

  // ============= MOCK DATA =============

  private mockRequests: LeaveRequestView[] = [
    {
      id: 'LV001', staffId: 'EMP001', staffName: 'John Doe', role: 'Chef',
      leaveType: 'SICK', startDate: new Date('2026-02-05'), endDate: new Date('2026-02-06'),
      days: 2, reason: 'Fever and cold', status: 'APPROVED',
      appliedDate: new Date('2026-02-04'), approvedBy: 'Manager', approvedDate: new Date('2026-02-04')
    },
    {
      id: 'LV002', staffId: 'EMP002', staffName: 'Jane Smith', role: 'Sous Chef',
      leaveType: 'CASUAL', startDate: new Date('2026-02-10'), endDate: new Date('2026-02-11'),
      days: 2, reason: 'Personal work', status: 'APPROVED',
      appliedDate: new Date('2026-02-08'), approvedBy: 'Manager', approvedDate: new Date('2026-02-09')
    },
    {
      id: 'LV003', staffId: 'EMP003', staffName: 'Mike Johnson', role: 'Line Cook',
      leaveType: 'EARNED', startDate: new Date('2026-02-18'), endDate: new Date('2026-02-20'),
      days: 3, reason: 'Family trip', status: 'PENDING',
      appliedDate: new Date('2026-02-15')
    },
    {
      id: 'LV004', staffId: 'EMP004', staffName: 'Sarah Wilson', role: 'Waiter',
      leaveType: 'CASUAL', startDate: new Date('2026-02-15'), endDate: new Date('2026-02-17'),
      days: 3, reason: 'Medical procedure', status: 'PENDING',
      appliedDate: new Date('2026-02-13')
    },
    {
      id: 'LV005', staffId: 'EMP005', staffName: 'David Brown', role: 'Bartender',
      leaveType: 'CASUAL', startDate: new Date('2026-02-12'), endDate: new Date('2026-02-12'),
      days: 0.5, isHalfDay: true, reason: 'Doctor appointment', status: 'REJECTED',
      appliedDate: new Date('2026-02-11'), rejectionReason: 'Understaffed on that day'
    },
    {
      id: 'LV006', staffId: 'EMP001', staffName: 'John Doe', role: 'Chef',
      leaveType: 'CASUAL', startDate: new Date('2026-02-20'), endDate: new Date('2026-02-21'),
      days: 2, reason: 'Personal errand', status: 'PENDING',
      appliedDate: new Date('2026-02-17')
    }
  ];

  private mockKpi: LeaveKpi = {
    pending: 3, approved: 2, rejected: 1, totalDays: 10, onLeaveToday: 1
  };

  private mockBalances: LeaveBalance[] = [
    { staffId: 'EMP001', staffName: 'John Doe',     sick: 10, casual: 5, earned: 14, unpaid: 0, totalUsed: 6,  totalAllotted: 35 },
    { staffId: 'EMP002', staffName: 'Jane Smith',   sick: 12, casual: 6, earned: 13, unpaid: 0, totalUsed: 6,  totalAllotted: 35 },
    { staffId: 'EMP003', staffName: 'Mike Johnson', sick: 11, casual: 8, earned: 12, unpaid: 0, totalUsed: 7,  totalAllotted: 35 },
    { staffId: 'EMP004', staffName: 'Sarah Wilson', sick: 9,  casual: 5, earned: 12, unpaid: 2, totalUsed: 12, totalAllotted: 35 },
    { staffId: 'EMP005', staffName: 'David Brown',  sick: 12, casual: 7, earned: 15, unpaid: 0, totalUsed: 1,  totalAllotted: 35 }
  ];

  private mockStaffOptions = [
    { id: 'EMP001', name: 'John Doe',     role: 'Chef' },
    { id: 'EMP002', name: 'Jane Smith',   role: 'Sous Chef' },
    { id: 'EMP003', name: 'Mike Johnson', role: 'Line Cook' },
    { id: 'EMP004', name: 'Sarah Wilson', role: 'Waiter' },
    { id: 'EMP005', name: 'David Brown',  role: 'Bartender' }
  ];

  // ============= LIFECYCLE =============

  ngOnInit(): void {
    if (!this.requests      || this.requests.length === 0)      this.requests      = this.mockRequests;
    if (!this.kpi)                                              this.kpi           = this.mockKpi;
    if (!this.leaveBalances || this.leaveBalances.length === 0) this.leaveBalances = this.mockBalances;
    if (!this.staffOptions  || this.staffOptions.length === 0)  this.staffOptions  = this.mockStaffOptions;
    this.viewMode = 'employee';
    this.generateCalendar();
  }

  // ============= VIEW TOGGLE =============

  switchToManager(): void {
    if (this.hasManagerAccess) this.viewMode = 'manager';
  }

  switchToEmployee(): void {
    this.viewMode = 'employee';
  }

  // ============= EMPLOYEE VIEW HELPERS =============

  get myRequests(): LeaveRequestView[] {
    return this.requests.filter(r => r.staffId === this.currentStaffId);
  }

  get myFilteredHistory(): LeaveRequestView[] {
    return this.empHistoryFilter === 'ALL'
      ? this.myRequests
      : this.myRequests.filter(r => r.status === this.empHistoryFilter);
  }

  get myBalance(): LeaveBalance | undefined {
    return this.leaveBalances.find(b => b.staffId === this.currentStaffId);
  }

  get myPendingCount():  number { return this.myRequests.filter(r => r.status === 'PENDING').length; }
  get myApprovedCount(): number { return this.myRequests.filter(r => r.status === 'APPROVED').length; }
  get myTotalDaysUsed(): number {
    return this.myRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((s, r) => s + r.days, 0);
  }

  getMyBalanceForType(type: LeaveType): number {
    const b = this.myBalance;
    if (!b) return this.ALLOTMENT[type];
    const map: Record<LeaveType, number> = {
      SICK: b.sick, CASUAL: b.casual, EARNED: b.earned, UNPAID: b.unpaid
    };
    return map[type] ?? 0;
  }

  getMyUsedForType(type: LeaveType): number {
    return this.ALLOTMENT[type] - this.getMyBalanceForType(type);
  }

  getUsedPercent(type: LeaveType): number {
    const used  = this.getMyUsedForType(type);
    const total = this.ALLOTMENT[type];
    return this.getBalancePercent(used, total);
  }

  // FIX 1: Replaces missing filterByEmpStatus pipe — resolves NG8004
  getCountByEmpStatus(status: FilterType): number {
    if (status === 'ALL') return this.myRequests.length;
    return this.myRequests.filter(r => r.status === status).length;
  }

  // ============= MANAGER FILTER =============

  get filteredRequests(): LeaveRequestView[] {
    return this.filter === 'ALL'
      ? this.requests
      : this.requests.filter(r => r.status === this.filter);
  }

  onFilterChange(value: FilterType): void {
    this.filter = value;
    this.filterChange.emit(value);
  }

  getCountByStatus(status: FilterType): number {
    if (status === 'ALL') return this.requests.length;
    return this.requests.filter(r => r.status === status).length;
  }

  // ============= APPROVE =============

  onApprove(id: string): void {
    const req = this.requests.find(r => r.id === id);
    if (req) { req.status = 'APPROVED'; req.approvedBy = 'Manager'; req.approvedDate = new Date(); }
    this.approve.emit(id);
    this.refreshKpi();
  }

  // ============= REJECT MODAL =============

  openRejectModal(id: string): void {
    this.rejectTargetId  = id;
    this.rejectReason    = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) return;
    const req = this.requests.find(r => r.id === this.rejectTargetId);
    if (req) { req.status = 'REJECTED'; req.rejectionReason = this.rejectReason; }
    this.reject.emit({ id: this.rejectTargetId, reason: this.rejectReason });
    this.showRejectModal = false;
    this.refreshKpi();
  }

  // ============= NEW REQUEST MODAL =============

  openNewRequestModal(): void {
    this.newLeaveForm = this.getEmptyForm();
    if (this.viewMode === 'employee') {
      this.newLeaveForm.staffId = this.currentStaffId;
    }
    this.showNewRequestModal = true;
    this.openRequestModal.emit();
  }

  submitNewRequest(): void {
    if (!this.newLeaveForm.staffId || !this.newLeaveForm.startDate || !this.newLeaveForm.reason.trim()) return;

    const days  = this.newLeaveForm.isHalfDay
      ? 0.5
      : this.calcDays(this.newLeaveForm.startDate, this.newLeaveForm.endDate || this.newLeaveForm.startDate);
    const staff = this.staffOptions.find(s => s.id === this.newLeaveForm.staffId);

    const newReq: LeaveRequestView = {
      id:          `LV${Date.now()}`,
      staffId:     this.newLeaveForm.staffId,
      staffName:   staff?.name || this.currentStaffName,
      role:        staff?.role || this.currentStaffRole,
      leaveType:   this.newLeaveForm.leaveType,
      startDate:   new Date(this.newLeaveForm.startDate),
      endDate:     new Date(this.newLeaveForm.endDate || this.newLeaveForm.startDate),
      days,
      isHalfDay:   this.newLeaveForm.isHalfDay,
      reason:      this.newLeaveForm.reason,
      status:      'PENDING',
      appliedDate: new Date()
    };

    this.requests = [newReq, ...this.requests];
    this.submitLeave.emit(this.newLeaveForm);
    this.showNewRequestModal = false;
    this.refreshKpi();
  }

  // ============= DETAIL MODAL =============

  openDetail(req: LeaveRequestView): void {
    this.selectedRequest = req;
    this.showDetailModal = true;
  }

  // ============= CALENDAR =============

  generateCalendar(): void {
    const year  = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());

    const weeks: Date[][] = [];
    const cur = new Date(start);
    while (cur <= last || weeks.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      weeks.push(week);
      if (cur > last && weeks.length >= 5) break;
    }
    this.calendarWeeks = weeks;
  }

  prevMonth(): void {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  getLeavesForDay(date: Date): LeaveRequestView[] {
    return this.requests.filter(r => {
      const s = new Date(r.startDate); s.setHours(0,0,0,0);
      const e = new Date(r.endDate);   e.setHours(23,59,59,999);
      const d = new Date(date);        d.setHours(12,0,0,0);
      return r.status !== 'REJECTED' && d >= s && d <= e;
    });
  }

  getMyLeavesForDay(date: Date): LeaveRequestView[] {
    return this.getLeavesForDay(date).filter(r => r.staffId === this.currentStaffId);
  }

  isToday(d: Date): boolean {
    const t = new Date();
    return d.getDate() === t.getDate()
      && d.getMonth()    === t.getMonth()
      && d.getFullYear() === t.getFullYear();
  }

  isOtherMonth(d: Date): boolean {
    return d.getMonth() !== this.calendarDate.getMonth();
  }

  // ============= HELPERS =============

  refreshKpi(): void {
    const today = new Date(); today.setHours(12,0,0,0);
    this.kpi = {
      pending:      this.requests.filter(r => r.status === 'PENDING').length,
      approved:     this.requests.filter(r => r.status === 'APPROVED').length,
      rejected:     this.requests.filter(r => r.status === 'REJECTED').length,
      totalDays:    this.requests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.days, 0),
      onLeaveToday: this.requests.filter(r => {
        if (r.status !== 'APPROVED') return false;
        const s = new Date(r.startDate); s.setHours(0,0,0,0);
        const e = new Date(r.endDate);   e.setHours(23,59,59,999);
        return today >= s && today <= e;
      }).length
    };
  }

  calcDays(start: string, end: string): number {
    const s = new Date(start), e = new Date(end);
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }

  getLeaveTypeLabel(type: LeaveType): string {
    const labels: Record<LeaveType, string> = {
      SICK: 'Sick Leave', CASUAL: 'Casual Leave', EARNED: 'Earned Leave', UNPAID: 'Unpaid Leave'
    };
    return labels[type] || type;
  }

  getLeaveTypeClass(type: LeaveType): string {
    const map: Record<LeaveType, string> = {
      SICK: 'type-sick', CASUAL: 'type-casual', EARNED: 'type-earned', UNPAID: 'type-unpaid'
    };
    return map[type] || '';
  }

  // FIX 3: Typed lookup — resolves NG3 (string can't index Record<LeaveType>)
  getLeaveColor(type: LeaveType): string {
    return this.leaveTypeColors[type];
  }

  getBalancePercent(used: number, total: number): number {
    return total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  }

  private getEmptyForm(): NewLeaveForm {
    return { staffId: '', leaveType: 'CASUAL', startDate: '', endDate: '', isHalfDay: false, reason: '' };
  }
}
