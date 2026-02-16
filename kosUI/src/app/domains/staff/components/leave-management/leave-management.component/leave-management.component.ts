import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type LeaveType = 'SICK' | 'CASUAL' | 'EARNED' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequestView {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  rejectionReason?: string;
}

export interface LeaveKpi {
  pending: number;
  approved: number;
  rejected: number;
  totalDays: number;
}

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.css']
})
export class LeaveManagementComponent {
  @Input() requests: LeaveRequestView[] = [];
  @Input() kpi!: LeaveKpi;
  @Input() filter: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'ALL';

  @Output() filterChange = new EventEmitter<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>();
  @Output() approve = new EventEmitter<string>(); // leaveId
  @Output() reject = new EventEmitter<string>();  // leaveId
  @Output() openRequestModal = new EventEmitter<void>();

  get filteredRequests(): LeaveRequestView[] {
    if (this.filter === 'ALL') return this.requests;
    return this.requests.filter((r) => r.status === this.filter);
  }

  onFilterChange(value: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'): void {
    this.filterChange.emit(value);
  }

  onApprove(id: string): void {
    this.approve.emit(id);
  }

  onReject(id: string): void {
    this.reject.emit(id);
  }

  onRequestLeave(): void {
    this.openRequestModal.emit();
  }

  getLeaveTypeLabel(type: LeaveType): string {
    const labels: Record<LeaveType, string> = {
      SICK: 'Sick Leave',
      CASUAL: 'Casual Leave',
      EARNED: 'Earned Leave',
      UNPAID: 'Unpaid Leave'
    };
    return labels[type] || type;
  }
}
