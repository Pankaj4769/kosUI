// src/app/domains/staff/models/attendance.model.ts

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE';

export interface AttendanceRecord {
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
