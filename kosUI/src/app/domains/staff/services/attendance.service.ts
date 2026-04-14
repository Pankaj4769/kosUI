import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EMPLOYEE_MGMT_URL } from '../../../apiUrls';
import { AttendanceRecord, AttendanceStatus } from '../models/attendance.model';

interface AttendanceDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  totalHours: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly API = `${EMPLOYEE_MGMT_URL}/api/attendance`;

  constructor(private http: HttpClient) {}

  getAttendanceForDate(date: Date): Observable<AttendanceRecord[]> {
    const dateStr = date.toISOString().split('T')[0];
    return this.http.get<AttendanceDTO[]>(`${this.API}/date/${dateStr}`).pipe(
      map(list => list.map(this.toRecord)),
      catchError(err => {
        console.error('Failed to load attendance:', err);
        return of([]);
      })
    );
  }

  getAttendanceForEmployee(employeeId: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceDTO[]>(`${this.API}/employee/${employeeId}`).pipe(
      map(list => list.map(this.toRecord)),
      catchError(() => of([]))
    );
  }

  getAttendanceForEmployeeRange(employeeId: string, start: Date, end: Date): Observable<AttendanceRecord[]> {
    const s = start.toISOString().split('T')[0];
    const e = end.toISOString().split('T')[0];
    return this.http.get<AttendanceDTO[]>(
      `${this.API}/employee/${employeeId}/range?start=${s}&end=${e}`
    ).pipe(
      map(list => list.map(this.toRecord)),
      catchError(() => of([]))
    );
  }

  markAttendance(staffId: string, status: AttendanceStatus, date?: Date, notes?: string): Observable<AttendanceRecord> {
    const payload = {
      employeeId: Number(staffId),
      date: (date ?? new Date()).toISOString().split('T')[0],
      status: status,
      clockIn: status === 'PRESENT' || status === 'LATE' ? this.nowTime() : null,
      notes: notes ?? ''
    };
    return this.http.post<AttendanceDTO>(this.API, payload).pipe(
      map(this.toRecord),
      catchError(err => {
        console.error('Failed to mark attendance:', err);
        // Return a local optimistic record
        const local: AttendanceRecord = {
          id: `ATT-${staffId}`,
          staffId,
          staffName: '',
          date: date ?? new Date(),
          clockIn: payload.clockIn,
          clockOut: null,
          status,
          totalHours: 0,
          notes
        };
        return of(local);
      })
    );
  }

  clockOut(attendanceId: string): Observable<AttendanceRecord> {
    return this.http.patch<AttendanceDTO>(`${this.API}/${attendanceId}/clockout`, {}).pipe(
      map(this.toRecord),
      catchError(err => {
        console.error('Failed to clock out:', err);
        return of({} as AttendanceRecord);
      })
    );
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private toRecord(dto: AttendanceDTO): AttendanceRecord {
    return {
      id: String(dto.id),
      staffId: String(dto.employeeId),
      staffName: dto.employeeName ?? '',
      date: new Date(dto.date),
      clockIn: dto.clockIn,
      clockOut: dto.clockOut,
      status: (dto.status ?? 'ABSENT') as AttendanceStatus,
      totalHours: dto.totalHours ?? 0,
      notes: dto.notes
    };
  }

  private nowTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit'
    });
  }
}
