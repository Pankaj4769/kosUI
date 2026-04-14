import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EMPLOYEE_MGMT_URL } from '../../../apiUrls';
import { LeaveRequest, LeaveStatus } from '../models/leave.model';

interface LeaveDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  reason: string;
  status: string;
  appliedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly API = `${EMPLOYEE_MGMT_URL}/api/leaves`;

  constructor(private http: HttpClient) {}

  getLeaveRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveDTO[]>(this.API).pipe(
      map(list => list.map(this.toLeaveRequest)),
      catchError(err => {
        console.error('Failed to load leave requests:', err);
        return of([]);
      })
    );
  }

  getLeavesByEmployee(employeeId: string): Observable<LeaveRequest[]> {
    return this.http.get<LeaveDTO[]>(`${this.API}/employee/${employeeId}`).pipe(
      map(list => list.map(this.toLeaveRequest)),
      catchError(() => of([]))
    );
  }

  getLeavesByStatus(status: LeaveStatus): Observable<LeaveRequest[]> {
    return this.http.get<LeaveDTO[]>(`${this.API}/status/${status}`).pipe(
      map(list => list.map(this.toLeaveRequest)),
      catchError(() => of([]))
    );
  }

  submitRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'appliedDate'>): Observable<LeaveRequest> {
    const payload = {
      employeeId: Number(request.staffId),
      leaveType: request.leaveType,
      startDate: new Date(request.startDate).toISOString().split('T')[0],
      endDate: new Date(request.endDate).toISOString().split('T')[0],
      isHalfDay: false,
      reason: request.reason
    };
    return this.http.post<LeaveDTO>(this.API, payload).pipe(
      map(this.toLeaveRequest),
      catchError(err => {
        console.error('Failed to submit leave:', err);
        const local: LeaveRequest = {
          ...request,
          id: 'LR-' + Math.floor(Math.random() * 10000),
          status: 'PENDING',
          appliedDate: new Date()
        };
        return of(local);
      })
    );
  }

  approve(leaveId: string, approvedBy: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveDTO>(`${this.API}/${leaveId}/approve`, { approvedBy }).pipe(
      map(this.toLeaveRequest),
      catchError(err => {
        console.error('Failed to approve leave:', err);
        return of({} as LeaveRequest);
      })
    );
  }

  reject(leaveId: string, reason: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveDTO>(`${this.API}/${leaveId}/reject`, { reason }).pipe(
      map(this.toLeaveRequest),
      catchError(err => {
        console.error('Failed to reject leave:', err);
        return of({} as LeaveRequest);
      })
    );
  }

  // Legacy sync method kept for components that mutate locally
  updateStatus(leave: LeaveRequest, status: LeaveStatus, managerName: string, reason?: string): LeaveRequest {
    const updated: LeaveRequest = { ...leave, status };
    if (status === 'APPROVED') {
      updated.approvedBy = managerName;
      updated.approvedDate = new Date();
    } else if (status === 'REJECTED') {
      updated.rejectionReason = reason || 'Not specified';
    }
    return updated;
  }

  // ─── Mapper ────────────────────────────────────────────────────────────────

  private toLeaveRequest(dto: LeaveDTO): LeaveRequest {
    return {
      id: String(dto.id),
      staffId: String(dto.employeeId),
      staffName: dto.employeeName ?? '',
      leaveType: dto.leaveType as any,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      days: dto.days,
      reason: dto.reason,
      status: dto.status as LeaveStatus,
      appliedDate: new Date(dto.appliedDate),
      approvedBy: dto.approvedBy,
      approvedDate: dto.approvedDate ? new Date(dto.approvedDate) : undefined,
      rejectionReason: dto.rejectionReason
    };
  }
}
