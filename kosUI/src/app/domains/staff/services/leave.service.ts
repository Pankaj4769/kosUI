// src/app/domains/staff/services/leave.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LeaveRequest, LeaveStatus } from '../models/leave.model';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  constructor() {}

  getLeaveRequests(): Observable<LeaveRequest[]> {
    // Same sample data you used in the dashboard
    const data: LeaveRequest[] = [
      {
        id: 'LR-001',
        staffId: 'STF-01',
        staffName: 'Sarah Jenkins',
        leaveType: 'SICK',
        startDate: new Date('2026-02-15'),
        endDate: new Date('2026-02-17'),
        days: 3,
        reason: 'Medical appointment',
        status: 'PENDING',
        appliedDate: new Date('2026-02-10')
      },
      {
        id: 'LR-002',
        staffId: 'STF-02',
        staffName: 'Marcus Chen',
        leaveType: 'CASUAL',
        startDate: new Date('2026-02-20'),
        endDate: new Date('2026-02-21'),
        days: 2,
        reason: 'Personal work',
        status: 'APPROVED',
        appliedDate: new Date('2026-02-12'),
        approvedBy: 'Manager',
        approvedDate: new Date('2026-02-13')
      }
    ];
    return of(data);
  }

  updateStatus(
    leave: LeaveRequest,
    status: LeaveStatus,
    managerName: string,
    reason?: string
  ): LeaveRequest {
    const updated: LeaveRequest = { ...leave, status };
    if (status === 'APPROVED') {
      updated.approvedBy = managerName;
      updated.approvedDate = new Date();
    } else if (status === 'REJECTED') {
      updated.rejectionReason = reason || 'Not specified';
    }
    return updated;
  }

  submitRequest(
    request: Omit<LeaveRequest, 'id' | 'status' | 'appliedDate'>
  ): Observable<LeaveRequest> {
    // In real life: POST to API and return observable
    const created: LeaveRequest = {
      ...request,
      id: 'LR-' + Math.floor(Math.random() * 10000),
      status: 'PENDING',
      appliedDate: new Date()
    };
    return of(created);
  }
}
