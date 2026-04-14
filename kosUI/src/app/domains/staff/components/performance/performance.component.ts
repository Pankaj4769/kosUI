import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export type ReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type ReviewCycle  = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface ReviewCriteria {
  label: string;
  score: number; // 1-5
}

export interface PerformanceReview {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  cycle: ReviewCycle;
  period: string;
  reviewedBy: string;
  status: ReviewStatus;
  criteria: ReviewCriteria[];
  overallScore: number;
  strengths: string;
  improvements: string;
  goals: string;
  createdDate: string;
  completedDate?: string;
}

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './performance.component.html',
  styleUrls: ['./performance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceComponent implements OnInit {

  reviews: PerformanceReview[] = [];
  employees: any[] = [];
  filterStatus = '';
  filterCycle  = '';
  activeTab: 'list' | 'form' | 'detail' = 'list';
  selectedReview: PerformanceReview | null = null;
  private nextId = 100;

  readonly defaultCriteria: ReviewCriteria[] = [
    { label: 'Punctuality & Attendance', score: 3 },
    { label: 'Job Knowledge & Skills',   score: 3 },
    { label: 'Work Quality',             score: 3 },
    { label: 'Teamwork & Cooperation',   score: 3 },
    { label: 'Customer Service',         score: 3 },
    { label: 'Initiative & Attitude',    score: 3 },
  ];

  form = {
    employeeId: 0, cycle: 'QUARTERLY' as ReviewCycle,
    period: this.currentQuarter(),
    reviewedBy: 'Manager',
    criteria: this.defaultCriteria.map(c => ({ ...c })),
    strengths: '', improvements: '', goals: ''
  };

  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.EMP).pipe(catchError(() => of([]))).subscribe(e => {
      this.employees = e; this.cdr.markForCheck();
    });
    this.seedData();
  }

  private currentQuarter(): string {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `Q${q} ${now.getFullYear()}`;
  }

  private seedData(): void {
    this.reviews = [
      {
        id: 1, employeeId: 1, employeeName: 'Arjun Kumar', department: 'Kitchen',
        cycle: 'QUARTERLY', period: 'Q1 2026', reviewedBy: 'Manager', status: 'COMPLETED',
        criteria: [
          { label: 'Punctuality & Attendance', score: 4 }, { label: 'Job Knowledge & Skills', score: 5 },
          { label: 'Work Quality', score: 4 },             { label: 'Teamwork & Cooperation', score: 4 },
          { label: 'Customer Service', score: 3 },         { label: 'Initiative & Attitude', score: 5 },
        ],
        overallScore: 4.2, strengths: 'Excellent cooking skills, always on time.',
        improvements: 'Needs to improve customer-facing communication.',
        goals: 'Lead junior chefs training by Q2.', createdDate: '2026-03-28', completedDate: '2026-03-30'
      },
      {
        id: 2, employeeId: 2, employeeName: 'Priya Sharma', department: 'Service',
        cycle: 'QUARTERLY', period: 'Q1 2026', reviewedBy: 'Manager', status: 'COMPLETED',
        criteria: [
          { label: 'Punctuality & Attendance', score: 5 }, { label: 'Job Knowledge & Skills', score: 4 },
          { label: 'Work Quality', score: 5 },             { label: 'Teamwork & Cooperation', score: 5 },
          { label: 'Customer Service', score: 5 },         { label: 'Initiative & Attitude', score: 4 },
        ],
        overallScore: 4.7, strengths: 'Outstanding customer service, great attitude.',
        improvements: 'Could improve POS speed.', goals: 'Train new waitstaff in Q2.',
        createdDate: '2026-03-28', completedDate: '2026-03-29'
      },
      {
        id: 3, employeeId: 3, employeeName: 'Ravi Patel', department: 'Kitchen',
        cycle: 'QUARTERLY', period: 'Q2 2026', reviewedBy: 'Manager', status: 'PENDING',
        criteria: this.defaultCriteria.map(c => ({ ...c })),
        overallScore: 0, strengths: '', improvements: '', goals: '', createdDate: '2026-04-01'
      },
    ];
    this.cdr.markForCheck();
  }

  get filtered(): PerformanceReview[] {
    return this.reviews.filter(r =>
      (!this.filterStatus || r.status === this.filterStatus) &&
      (!this.filterCycle  || r.cycle  === this.filterCycle)
    );
  }

  get avgScore(): number {
    const done = this.reviews.filter(r => r.status === 'COMPLETED');
    if (!done.length) return 0;
    return +(done.reduce((s, r) => s + r.overallScore, 0) / done.length).toFixed(1);
  }
  get completedCount(): number { return this.reviews.filter(r => r.status === 'COMPLETED').length; }
  get pendingCount(): number   { return this.reviews.filter(r => r.status === 'PENDING').length; }

  openNew(): void {
    this.form = {
      employeeId: 0, cycle: 'QUARTERLY', period: this.currentQuarter(),
      reviewedBy: 'Manager',
      criteria: this.defaultCriteria.map(c => ({ ...c })),
      strengths: '', improvements: '', goals: ''
    };
    this.activeTab = 'form'; this.cdr.markForCheck();
  }

  openDetail(r: PerformanceReview): void {
    this.selectedReview = r; this.activeTab = 'detail'; this.cdr.markForCheck();
  }

  computedOverall(): number {
    const total = this.form.criteria.reduce((s, c) => s + c.score, 0);
    return +(total / this.form.criteria.length).toFixed(1);
  }

  save(): void {
    if (!this.form.employeeId) return;
    const emp = this.employees.find(e => e.id === this.form.employeeId);
    const review: PerformanceReview = {
      id: this.nextId++,
      employeeId:    this.form.employeeId,
      employeeName:  emp?.name ?? `#${this.form.employeeId}`,
      department:    emp?.departmentName ?? '',
      cycle:         this.form.cycle,
      period:        this.form.period,
      reviewedBy:    this.form.reviewedBy,
      status:        'COMPLETED',
      criteria:      this.form.criteria.map(c => ({ ...c })),
      overallScore:  this.computedOverall(),
      strengths:     this.form.strengths,
      improvements:  this.form.improvements,
      goals:         this.form.goals,
      createdDate:   new Date().toISOString().split('T')[0],
      completedDate: new Date().toISOString().split('T')[0],
    };
    this.reviews.unshift(review);
    this.activeTab = 'list'; this.cdr.markForCheck();
  }

  scoreStars(score: number): number[] { return Array.from({ length: 5 }, (_, i) => i + 1); }

  scoreColor(s: number): string {
    if (s >= 4.5) return '#16a34a';
    if (s >= 3.5) return '#3b82f6';
    if (s >= 2.5) return '#f59e0b';
    return '#ef4444';
  }

  statusClass(s: string): string {
    return s === 'COMPLETED' ? 'badge-ok' : s === 'IN_PROGRESS' ? 'badge-info' : 'badge-warn';
  }
}
