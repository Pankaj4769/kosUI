import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ShiftTemplateView {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  isActive: boolean;
}

export interface ShiftAssignmentView {
  id: string;
  staffId: string;
  staffName: string;
  shiftId: string;
  shiftName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'MISSED';
}

export interface ShiftKpi {
  activeShifts: number;
  onDuty: number;
  offDuty: number;
  currentShift: string;
}

@Component({
  selector: 'app-shift-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shift-management.component.html',
  styleUrls: ['./shift-management.component.css']
})
export class ShiftManagementComponent {
  @Input() templates: ShiftTemplateView[] = [];
  @Input() assignments: ShiftAssignmentView[] = [];
  @Input() kpi!: ShiftKpi;
  @Input() selectedDate!: Date;

  @Output() openTemplateModal = new EventEmitter<ShiftTemplateView | null>();
  @Output() autoGenerateRoster = new EventEmitter<void>();

  getAssignmentsByShift(shiftId: string): ShiftAssignmentView[] {
    return this.assignments.filter((a) => a.shiftId === shiftId);
  }

  onAddShift(): void {
    this.openTemplateModal.emit(null);
  }

  onEditShift(shift: ShiftTemplateView): void {
    this.openTemplateModal.emit(shift);
  }

  onAutoGenerate(): void {
    this.autoGenerateRoster.emit();
  }
}
