// src/app/domains/staff/services/attendance.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AttendanceRecord, AttendanceStatus } from '../models/attendance.model';
import { StaffMember } from '../services/staff.service';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  constructor() {}

  getAttendanceForDate(
    staff: StaffMember[],
    date: Date
  ): Observable<AttendanceRecord[]> {
    const records: AttendanceRecord[] = staff.map((s) => ({
      id: `ATT-${s.id}`,
      staffId: s.id,
      staffName: s.name,
      date,
      clockIn: this.getRandomTime('09:00', '09:30'),
      clockOut: this.getRandomTime('17:00', '18:00'),
      status: this.getRandomAttendanceStatus(),
      totalHours: 8,
      notes: ''
    }));
    return of(records);
  }

  // In a real app these would call an API
  markAttendance(
    record: AttendanceRecord,
    status: AttendanceStatus
  ): AttendanceRecord {
    const updated: AttendanceRecord = { ...record, status };
    if (status === 'PRESENT' || status === 'LATE') {
      updated.clockIn = this.nowTime();
    }
    return updated;
  }

  clockOut(record: AttendanceRecord): AttendanceRecord {
    return {
      ...record,
      clockOut: this.nowTime()
    };
  }

  // ===== helpers (kept private, same behaviour as before) =====

  private getRandomTime(start: string, end: string): string {
    const startHour = parseInt(start.split(':')[0], 10);
    const endHour = parseInt(end.split(':')[0], 10);
    const hour =
      Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`;
  }

  private getRandomAttendanceStatus(): AttendanceStatus {
    const rand = Math.random();
    if (rand > 0.9) return 'ABSENT';
    if (rand > 0.8) return 'LATE';
    if (rand > 0.95) return 'ON_LEAVE';
    return 'PRESENT';
  }

  private nowTime(): string {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
