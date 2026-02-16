import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Keep types local to this component to avoid circular deps;
// they structurally match your dashboard interfaces.
export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ON_LEAVE';

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

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css']
})
export class AttendanceComponent {
  @Input() records: AttendanceRecordView[] = [];
  @Input() kpi!: AttendanceKpi;
  @Input() selectedDate!: Date;

  @Output() dateChange = new EventEmitter<Date>();
  @Output() markAttendance = new EventEmitter<{
    staffId: string;
    status: AttendanceStatus;
  }>();
  @Output() clockOut = new EventEmitter<string>(); // staffId
  @Output() viewDetails = new EventEmitter<AttendanceRecordView>();

  onDateChange(value: string): void {
    this.dateChange.emit(new Date(value));
  }

  onMarkAttendance(staffId: string, status: AttendanceStatus): void {
    this.markAttendance.emit({ staffId, status });
  }

  onClockOut(staffId: string): void {
    this.clockOut.emit(staffId);
  }

  onViewDetails(record: AttendanceRecordView): void {
    this.viewDetails.emit(record);
  }

  getAttendanceStatusColor(status: AttendanceStatus): string {
    const colors: Record<AttendanceStatus, string> = {
      PRESENT: '#22c55e',
      ABSENT: '#ef4444',
      LATE: '#fbbf24',
      HALF_DAY: '#fb923c',
      ON_LEAVE: '#6366f1'
    };
    return colors[status] || '#999';
  }
}
