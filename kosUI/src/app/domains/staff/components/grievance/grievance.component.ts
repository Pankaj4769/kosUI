import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export type GrievanceStatus   = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED' | 'ESCALATED';
export type GrievanceCategory = 'SALARY' | 'HARASSMENT' | 'WORKLOAD' | 'LEAVE' | 'FACILITIES' | 'DISCRIMINATION' | 'OTHER';
export type GrievancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface GrievanceComment {
  author: string;
  text: string;
  date: string;
}

export interface Grievance {
  id: number;
  ticketNo: string;
  employeeId: number;
  employeeName: string;
  category: GrievanceCategory;
  priority: GrievancePriority;
  subject: string;
  description: string;
  status: GrievanceStatus;
  raisedDate: string;
  resolvedDate?: string;
  assignedTo: string;
  resolution?: string;
  comments: GrievanceComment[];
  anonymous: boolean;
}

@Component({
  selector: 'app-grievance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grievance.component.html',
  styleUrls: ['./grievance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GrievanceComponent implements OnInit {

  grievances: Grievance[] = [];
  employees: any[] = [];
  selected: Grievance | null = null;
  showModal = false;
  filterStatus   = '';
  filterCategory = '';
  filterPriority = '';
  newComment = '';
  private nextId = 100;

  form = {
    employeeId: 0, category: 'OTHER' as GrievanceCategory,
    priority: 'MEDIUM' as GrievancePriority,
    subject: '', description: '', anonymous: false
  };

  readonly categories: GrievanceCategory[] = ['SALARY','HARASSMENT','WORKLOAD','LEAVE','FACILITIES','DISCRIMINATION','OTHER'];
  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.EMP).pipe(catchError(() => of([]))).subscribe(e => {
      this.employees = e; this.cdr.markForCheck();
    });
    this.seedData();
  }

  private seedData(): void {
    this.grievances = [
      {
        id: 1, ticketNo: 'GRV-001', employeeId: 2, employeeName: 'Priya Sharma',
        category: 'SALARY', priority: 'HIGH', subject: 'Salary not credited on time',
        description: 'My salary for March has not been credited even after the 5th.',
        status: 'IN_REVIEW', raisedDate: '2026-04-06', assignedTo: 'HR Manager', anonymous: false,
        comments: [{ author: 'HR Manager', text: 'We are looking into this with the accounts team.', date: '2026-04-07' }]
      },
      {
        id: 2, ticketNo: 'GRV-002', employeeId: 3, employeeName: 'Anonymous',
        category: 'HARASSMENT', priority: 'CRITICAL', subject: 'Workplace harassment complaint',
        description: 'Raising this anonymously. There is inappropriate behaviour from a team lead.',
        status: 'ESCALATED', raisedDate: '2026-04-05', assignedTo: 'Senior Management', anonymous: true,
        comments: [{ author: 'HR', text: 'Escalated to senior management. Investigation initiated.', date: '2026-04-06' }]
      },
      {
        id: 3, ticketNo: 'GRV-003', employeeId: 4, employeeName: 'Sunita Verma',
        category: 'LEAVE', priority: 'MEDIUM', subject: 'Leave application rejected without reason',
        description: 'My casual leave was rejected without any explanation from the manager.',
        status: 'RESOLVED', raisedDate: '2026-03-25', resolvedDate: '2026-03-28', assignedTo: 'HR Manager',
        resolution: 'Discussed with manager. Leave re-approved with apology.', anonymous: false,
        comments: []
      },
      {
        id: 4, ticketNo: 'GRV-004', employeeId: 1, employeeName: 'Arjun Kumar',
        category: 'FACILITIES', priority: 'LOW', subject: 'Kitchen equipment in poor condition',
        description: 'Two burners are not working properly. Safety hazard.',
        status: 'OPEN', raisedDate: '2026-04-09', assignedTo: 'Unassigned', anonymous: false,
        comments: []
      },
    ];
    this.cdr.markForCheck();
  }

  get filtered(): Grievance[] {
    return this.grievances.filter(g =>
      (!this.filterStatus   || g.status   === this.filterStatus) &&
      (!this.filterCategory || g.category === this.filterCategory) &&
      (!this.filterPriority || g.priority === this.filterPriority)
    );
  }

  get openCount(): number      { return this.grievances.filter(g => g.status === 'OPEN').length; }
  get escalatedCount(): number { return this.grievances.filter(g => g.status === 'ESCALATED').length; }
  get resolvedCount(): number  { return this.grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length; }

  openDetail(g: Grievance): void { this.selected = g; this.cdr.markForCheck(); }

  updateStatus(g: Grievance, status: GrievanceStatus): void {
    g.status = status;
    if (status === 'RESOLVED' || status === 'CLOSED') {
      g.resolvedDate = new Date().toISOString().split('T')[0];
    }
    this.cdr.markForCheck();
  }

  addComment(): void {
    if (!this.newComment.trim() || !this.selected) return;
    this.selected.comments.push({
      author: 'Manager',
      text: this.newComment.trim(),
      date: new Date().toISOString().split('T')[0]
    });
    this.newComment = '';
    this.cdr.markForCheck();
  }

  openNew(): void {
    this.form = { employeeId: 0, category: 'OTHER', priority: 'MEDIUM', subject: '', description: '', anonymous: false };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.subject || !this.form.description) return;
    const emp = this.employees.find(e => e.id === this.form.employeeId);
    const g: Grievance = {
      id: this.nextId,
      ticketNo: `GRV-${String(this.nextId++).padStart(3,'0')}`,
      employeeId:   this.form.employeeId,
      employeeName: this.form.anonymous ? 'Anonymous' : (emp?.name ?? 'Unknown'),
      category:     this.form.category,
      priority:     this.form.priority,
      subject:      this.form.subject,
      description:  this.form.description,
      status:       'OPEN',
      raisedDate:   new Date().toISOString().split('T')[0],
      assignedTo:   'Unassigned',
      anonymous:    this.form.anonymous,
      comments:     []
    };
    this.grievances.unshift(g);
    this.showModal = false;
    this.cdr.markForCheck();
  }

  priorityClass(p: string): string {
    const m: Record<string,string> = { LOW:'badge-muted', MEDIUM:'badge-info', HIGH:'badge-warn', CRITICAL:'badge-err' };
    return m[p] ?? 'badge-muted';
  }

  statusClass(s: string): string {
    const m: Record<string,string> = { OPEN:'badge-warn', IN_REVIEW:'badge-info', RESOLVED:'badge-ok', CLOSED:'badge-muted', ESCALATED:'badge-err' };
    return m[s] ?? 'badge-muted';
  }

  catIcon(c: string): string {
    const m: Record<string,string> = { SALARY:'payments', HARASSMENT:'report', WORKLOAD:'work_history', LEAVE:'calendar_today', FACILITIES:'handyman', DISCRIMINATION:'balance', OTHER:'help_outline' };
    return m[c] ?? 'help_outline';
  }
}
