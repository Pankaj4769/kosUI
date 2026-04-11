import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ChecklistItem {
  id: number;
  task: string;
  category: string;
  completed: boolean;
  dueDate?: string;
  completedDate?: string;
  assignedTo: string;
  notes?: string;
}

export interface OnboardingRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  role: string;
  department: string;
  joinDate: string;
  status: OnboardingStatus;
  checklist: ChecklistItem[];
  progress: number;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingComponent implements OnInit {

  records: OnboardingRecord[] = [];
  employees: any[] = [];
  selected: OnboardingRecord | null = null;
  showNew = false;
  filterStatus = '';
  newForm = { employeeId: 0, joinDate: new Date().toISOString().split('T')[0] };
  private nextId = 100;

  private readonly defaultChecklist: Omit<ChecklistItem, 'id' | 'completed' | 'completedDate'>[] = [
    { task: 'Collect identity documents',     category: 'Documents',    dueDate: '', assignedTo: 'HR' },
    { task: 'Sign employment contract',        category: 'Documents',    dueDate: '', assignedTo: 'HR' },
    { task: 'Bank account details collection', category: 'Payroll',      dueDate: '', assignedTo: 'HR' },
    { task: 'PF / ESI enrollment',             category: 'Payroll',      dueDate: '', assignedTo: 'HR' },
    { task: 'Uniform & equipment issued',      category: 'Setup',        dueDate: '', assignedTo: 'Manager' },
    { task: 'System login credentials',        category: 'Setup',        dueDate: '', assignedTo: 'Manager' },
    { task: 'Introduction to team',            category: 'Orientation',  dueDate: '', assignedTo: 'Manager' },
    { task: 'Restaurant tour & safety brief',  category: 'Orientation',  dueDate: '', assignedTo: 'Manager' },
    { task: 'Food safety & hygiene training',  category: 'Training',     dueDate: '', assignedTo: 'Trainer' },
    { task: 'POS system training',             category: 'Training',     dueDate: '', assignedTo: 'Trainer' },
    { task: 'Role-specific skills training',   category: 'Training',     dueDate: '', assignedTo: 'Trainer' },
    { task: '30-day check-in with manager',    category: 'Follow-up',    dueDate: '', assignedTo: 'Manager' },
  ];

  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.EMP).pipe(catchError(() => of([]))).subscribe(e => {
      this.employees = e; this.cdr.markForCheck();
    });
    this.seedData();
  }

  private buildChecklist(offset: number = 0): ChecklistItem[] {
    return this.defaultChecklist.map((t, i) => ({
      ...t, id: i + 1 + offset,
      completed: false, completedDate: undefined
    }));
  }

  private calcProgress(r: OnboardingRecord): number {
    if (!r.checklist.length) return 0;
    return Math.round((r.checklist.filter(c => c.completed).length / r.checklist.length) * 100);
  }

  private seedData(): void {
    const r1checklist = this.buildChecklist(0);
    r1checklist.slice(0, 8).forEach(c => { c.completed = true; c.completedDate = '2026-03-15'; });
    const r1: OnboardingRecord = {
      id: 1, employeeId: 3, employeeName: 'Ravi Patel', role: 'Chef', department: 'Kitchen',
      joinDate: '2026-03-10', status: 'IN_PROGRESS', checklist: r1checklist, progress: 0
    };
    r1.progress = this.calcProgress(r1);

    const r2checklist = this.buildChecklist(100);
    r2checklist.forEach(c => { c.completed = true; c.completedDate = '2026-02-20'; });
    const r2: OnboardingRecord = {
      id: 2, employeeId: 1, employeeName: 'Arjun Kumar', role: 'Senior Chef', department: 'Kitchen',
      joinDate: '2026-02-01', status: 'COMPLETED', checklist: r2checklist, progress: 100
    };

    const r3checklist = this.buildChecklist(200);
    const r3: OnboardingRecord = {
      id: 3, employeeId: 5, employeeName: 'Mohan Das', role: 'Waiter', department: 'Service',
      joinDate: '2026-04-08', status: 'NOT_STARTED', checklist: r3checklist, progress: 0
    };

    this.records = [r1, r2, r3];
    this.cdr.markForCheck();
  }

  get filtered(): OnboardingRecord[] {
    return this.records.filter(r => !this.filterStatus || r.status === this.filterStatus);
  }

  get inProgressCount(): number { return this.records.filter(r => r.status === 'IN_PROGRESS').length; }
  get completedCount(): number  { return this.records.filter(r => r.status === 'COMPLETED').length; }
  get notStartedCount(): number { return this.records.filter(r => r.status === 'NOT_STARTED').length; }

  toggleTask(r: OnboardingRecord, item: ChecklistItem): void {
    item.completed = !item.completed;
    item.completedDate = item.completed ? new Date().toISOString().split('T')[0] : undefined;
    r.progress = this.calcProgress(r);
    r.status = r.progress === 100 ? 'COMPLETED' : r.progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
    this.cdr.markForCheck();
  }

  openRecord(r: OnboardingRecord): void { this.selected = r; this.cdr.markForCheck(); }

  createNew(): void {
    if (!this.newForm.employeeId) return;
    const emp = this.employees.find(e => e.id === this.newForm.employeeId);
    const checklist = this.buildChecklist(this.nextId * 100);
    const r: OnboardingRecord = {
      id: this.nextId++,
      employeeId:   this.newForm.employeeId,
      employeeName: emp?.name ?? `#${this.newForm.employeeId}`,
      role:         emp?.roleName ?? '',
      department:   emp?.departmentName ?? '',
      joinDate:     this.newForm.joinDate,
      status:       'NOT_STARTED',
      checklist,
      progress:     0
    };
    this.records.unshift(r);
    this.showNew = false;
    this.cdr.markForCheck();
  }

  completedTasks(r: OnboardingRecord): number {
    return r.checklist.filter(c => c.completed).length;
  }

  groupedTasks(checklist: ChecklistItem[]): { category: string; items: ChecklistItem[] }[] {
    const groups: Record<string, ChecklistItem[]> = {};
    checklist.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return Object.entries(groups).map(([category, items]) => ({ category, items }));
  }

  statusClass(s: string): string {
    return s === 'COMPLETED' ? 'badge-ok' : s === 'IN_PROGRESS' ? 'badge-info' : 'badge-muted';
  }
}
