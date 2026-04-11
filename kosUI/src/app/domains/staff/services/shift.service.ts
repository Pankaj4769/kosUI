import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ShiftTemplateView,
  ShiftAssignmentView,
  ShiftKpi
} from '../components/shift-management/shift-management.component';

const TEMPLATES_KEY = 'kos_shift_templates';
const ASSIGNMENTS_KEY = 'kos_shift_assignments';

const DEFAULT_TEMPLATES: ShiftTemplateView[] = [
  { id: 'SH001', name: 'General', startTime: '09:00', endTime: '17:00', duration: 8, isActive: true },
  { id: 'SH002', name: 'Morning', startTime: '06:00', endTime: '14:00', duration: 8, isActive: true },
  { id: 'SH003', name: 'Evening', startTime: '14:00', endTime: '22:00', duration: 8, isActive: true }
];

@Injectable({ providedIn: 'root' })
export class ShiftService {

  private templatesSubject = new BehaviorSubject<ShiftTemplateView[]>(this.loadTemplates());
  private assignmentsSubject = new BehaviorSubject<ShiftAssignmentView[]>(this.loadAssignments());

  readonly templates$ = this.templatesSubject.asObservable();
  readonly assignments$ = this.assignmentsSubject.asObservable();

  get templates(): ShiftTemplateView[] { return this.templatesSubject.value; }
  get assignments(): ShiftAssignmentView[] { return this.assignmentsSubject.value; }

  addAssignments(newOnes: ShiftAssignmentView[]): void {
    const updated = [...this.assignmentsSubject.value, ...newOnes];
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(updated));
    this.assignmentsSubject.next(updated);
  }

  deleteAssignment(id: string): void {
    const updated = this.assignmentsSubject.value.filter(a => a.id !== id);
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(updated));
    this.assignmentsSubject.next(updated);
  }

  computeKpi(): ShiftKpi {
    const today = new Date();
    const todayStr = today.toDateString();
    const todayAssignments = this.assignmentsSubject.value.filter(
      a => new Date(a.date).toDateString() === todayStr
    );
    const hour = today.getHours();
    const currentShift =
      hour >= 6 && hour < 14 ? 'Morning' :
      hour >= 14 && hour < 22 ? 'Evening' : 'Night';

    return {
      activeShifts: this.templatesSubject.value.filter(t => t.isActive).length,
      onDuty: todayAssignments.filter(a => a.status === 'ACTIVE' || a.status === 'SCHEDULED').length,
      offDuty: todayAssignments.filter(a => a.status === 'COMPLETED').length,
      currentShift
    };
  }

  private loadTemplates(): ShiftTemplateView[] {
    try {
      const stored = localStorage.getItem(TEMPLATES_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES;
    } catch {
      return DEFAULT_TEMPLATES;
    }
  }

  private loadAssignments(): ShiftAssignmentView[] {
    try {
      const stored = localStorage.getItem(ASSIGNMENTS_KEY);
      if (!stored) return [];
      return JSON.parse(stored).map((a: any) => ({ ...a, date: new Date(a.date) }));
    } catch {
      return [];
    }
  }
}
