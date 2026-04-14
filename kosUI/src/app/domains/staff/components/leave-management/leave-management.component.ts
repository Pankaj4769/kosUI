import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { StaffService } from '../../services/staff.service';
import { LeaveService } from '../../services/leave.service';
import { LeaveType, LeaveStatus } from '../../models/leave.model';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type ViewMode   = 'employee' | 'manager';

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

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.css']
})
export class LeaveManagementComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── Session ──────────────────────────────────────────────────────────────
  currentStaffId   = '';   // EM employee id
  currentStaffName = '';
  currentStaffRole = '';
  hasManagerAccess = false;

  // ── Data ─────────────────────────────────────────────────────────────────
  requests: LeaveRequestView[]  = [];
  kpi: LeaveKpi = { pending: 0, approved: 0, rejected: 0, totalDays: 0, onLeaveToday: 0 };
  leaveBalances: LeaveBalance[] = [];
  staffOptions: { id: string; name: string; role: string }[] = [];
  loading = false;
  errorMessage: string | null = null;

  // ── View State ───────────────────────────────────────────────────────────
  viewMode: ViewMode = 'employee';
  filter: FilterType = 'ALL';
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

  // ── Constants ────────────────────────────────────────────────────────────
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

  // ── Lifecycle ────────────────────────────────────────────────────────────
  constructor(
    private auth: AuthService,
    private staffSvc: StaffService,
    private leaveSvc: LeaveService
  ) {}

  ngOnInit(): void {
    this.resolveSession();
    this.generateCalendar();
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
    this.currentStaffRole = user.role;
    this.hasManagerAccess = user.role === 'OWNER' || user.role === 'MANAGER';

    const restaurantId = user.restaurantId ?? '';
    this.staffSvc.loadStaff(restaurantId);
    this.staffSvc.staff$.pipe(takeUntil(this.destroy$)).subscribe(staffList => {
      // Build staff options for manager view (dropdown)
      this.staffOptions = staffList
        .filter(s => s.emId)
        .map(s => ({ id: s.emId!, name: s.name, role: s.roleName }));

      // Find current user's EM id
      const me = staffList.find(s => s.id === String(user.staffId));
      if (me?.emId) {
        this.currentStaffId = me.emId;
      }

      this.loadLeaves();
    });
  }

  // ── Data Loading ─────────────────────────────────────────────────────────
  loadLeaves(): void {
    this.loading = true;
    this.errorMessage = null;

    const source$ = (this.hasManagerAccess && this.viewMode === 'manager')
      ? this.leaveSvc.getLeaveRequests()
      : this.currentStaffId
        ? this.leaveSvc.getLeavesByEmployee(this.currentStaffId)
        : of([]);

    source$.pipe(
      catchError(() => {
        this.errorMessage = 'Failed to load leave requests.';
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe(leaves => {
      this.requests = leaves.map(l => ({ ...l } as LeaveRequestView));
      this.refreshKpi();
      this.buildBalances();
      this.loading = false;
    });
  }

  // Build leave balances from loaded requests (remaining = allotted - approved days)
  private buildBalances(): void {
    const byStaff = new Map<string, { name: string; used: Record<LeaveType, number> }>();

    this.requests
      .filter(r => r.status === 'APPROVED')
      .forEach(r => {
        if (!byStaff.has(r.staffId)) {
          byStaff.set(r.staffId, {
            name: r.staffName,
            used: { SICK: 0, CASUAL: 0, EARNED: 0, UNPAID: 0 }
          });
        }
        byStaff.get(r.staffId)!.used[r.leaveType] += r.days;
      });

    this.leaveBalances = Array.from(byStaff.entries()).map(([staffId, data]) => {
      const totalUsed = Object.values(data.used).reduce((a, b) => a + b, 0);
      const totalAllotted = Object.values(this.ALLOTMENT).reduce((a, b) => a + b, 0);
      return {
        staffId,
        staffName:    data.name,
        sick:         this.ALLOTMENT.SICK   - data.used.SICK,
        casual:       this.ALLOTMENT.CASUAL - data.used.CASUAL,
        earned:       this.ALLOTMENT.EARNED - data.used.EARNED,
        unpaid:       this.ALLOTMENT.UNPAID - data.used.UNPAID,
        totalUsed,
        totalAllotted
      };
    });
  }

  // ── View Toggle ──────────────────────────────────────────────────────────
  switchToManager(): void {
    if (!this.hasManagerAccess) return;
    this.viewMode = 'manager';
    this.loadLeaves();
  }

  switchToEmployee(): void {
    this.viewMode = 'employee';
    this.loadLeaves();
  }

  // ── Employee View Helpers ─────────────────────────────────────────────────
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
    return this.myRequests.filter(r => r.status === 'APPROVED').reduce((s, r) => s + r.days, 0);
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
    return this.getBalancePercent(this.getMyUsedForType(type), this.ALLOTMENT[type]);
  }

  getCountByEmpStatus(status: FilterType): number {
    if (status === 'ALL') return this.myRequests.length;
    return this.myRequests.filter(r => r.status === status).length;
  }

  // ── Manager Filter ────────────────────────────────────────────────────────
  get filteredRequests(): LeaveRequestView[] {
    return this.filter === 'ALL'
      ? this.requests
      : this.requests.filter(r => r.status === this.filter);
  }

  onFilterChange(value: FilterType): void {
    this.filter = value;
  }

  getCountByStatus(status: FilterType): number {
    if (status === 'ALL') return this.requests.length;
    return this.requests.filter(r => r.status === status).length;
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  onApprove(id: string): void {
    this.leaveSvc.approve(id, this.currentStaffName).pipe(takeUntil(this.destroy$)).subscribe({
      next: updated => {
        const idx = this.requests.findIndex(r => r.id === id);
        if (idx !== -1) {
          this.requests[idx] = { ...this.requests[idx], status: 'APPROVED',
            approvedBy: updated.approvedBy, approvedDate: updated.approvedDate };
        }
        this.refreshKpi();
        this.buildBalances();
      },
      error: () => { this.errorMessage = 'Failed to approve leave.'; }
    });
  }

  // ── Reject Modal ──────────────────────────────────────────────────────────
  openRejectModal(id: string): void {
    this.rejectTargetId  = id;
    this.rejectReason    = '';
    this.showRejectModal = true;
  }

  confirmReject(): void {
    if (!this.rejectReason.trim()) return;
    this.leaveSvc.reject(this.rejectTargetId, this.rejectReason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const idx = this.requests.findIndex(r => r.id === this.rejectTargetId);
        if (idx !== -1) {
          this.requests[idx] = { ...this.requests[idx], status: 'REJECTED', rejectionReason: this.rejectReason };
        }
        this.refreshKpi();
        this.buildBalances();
      },
      error: () => { this.errorMessage = 'Failed to reject leave.'; }
    });
    this.showRejectModal = false;
  }

  // ── New Request Modal ─────────────────────────────────────────────────────
  openNewRequestModal(): void {
    this.newLeaveForm = this.getEmptyForm();
    if (this.viewMode === 'employee') {
      this.newLeaveForm.staffId = this.currentStaffId;
    }
    this.showNewRequestModal = true;
  }

  submitNewRequest(): void {
    if (!this.newLeaveForm.staffId || !this.newLeaveForm.startDate || !this.newLeaveForm.reason.trim()) return;

    const payload = {
      staffId:   this.newLeaveForm.staffId,
      staffName: this.staffOptions.find(s => s.id === this.newLeaveForm.staffId)?.name ?? this.currentStaffName,
      leaveType: this.newLeaveForm.leaveType,
      startDate: new Date(this.newLeaveForm.startDate),
      endDate:   new Date(this.newLeaveForm.endDate || this.newLeaveForm.startDate),
      days:      this.newLeaveForm.isHalfDay
        ? 0.5
        : this.calcDays(this.newLeaveForm.startDate, this.newLeaveForm.endDate || this.newLeaveForm.startDate),
      reason:    this.newLeaveForm.reason
    };

    this.leaveSvc.submitRequest(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => {
        this.requests = [saved as LeaveRequestView, ...this.requests];
        this.refreshKpi();
        this.showNewRequestModal = false;
      },
      error: () => { this.errorMessage = 'Failed to submit leave request.'; }
    });
  }

  // ── Detail Modal ──────────────────────────────────────────────────────────
  openDetail(req: LeaveRequestView): void {
    this.selectedRequest = req;
    this.showDetailModal = true;
  }

  // ── Calendar ──────────────────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────────
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
