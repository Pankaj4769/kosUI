import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export type ExpenseStatus   = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExpenseCategory = 'TRAVEL' | 'FOOD' | 'SUPPLIES' | 'UNIFORM' | 'TRAINING' | 'MEDICAL' | 'OTHER';

export interface ExpenseClaim {
  id: number;
  employeeId: number;
  employeeName: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  approvedBy?: string;
  paidDate?: string;
  notes?: string;
}

@Component({
  selector: 'app-expense-reimbursement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-reimbursement.component.html',
  styleUrls: ['./expense-reimbursement.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseReimbursementComponent implements OnInit {

  claims: ExpenseClaim[] = [];
  employees: any[] = [];
  filterStatus   = '';
  filterCategory = '';
  filterMonth    = new Date().toISOString().substring(0, 7);
  showModal = false;
  saving    = false;
  error     = '';
  private nextId = 100;

  form: Omit<ExpenseClaim, 'id' | 'status' | 'employeeName'> = {
    employeeId: 0, category: 'TRAVEL', description: '', amount: 0,
    date: new Date().toISOString().split('T')[0], notes: ''
  };

  readonly categories: ExpenseCategory[] = ['TRAVEL','FOOD','SUPPLIES','UNIFORM','TRAINING','MEDICAL','OTHER'];
  private readonly EMP = `${EMPLOYEE_MGMT_URL}/api/employees`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>(this.EMP).pipe(catchError(() => of([]))).subscribe(e => {
      this.employees = e; this.cdr.markForCheck();
    });
    this.seedData();
  }

  private seedData(): void {
    this.claims = [
      { id:1, employeeId:1, employeeName:'Arjun Kumar',  category:'TRAVEL',   description:'Bus fare to supplier',  amount:450,  date:'2026-04-02', status:'PAID',      approvedBy:'Manager', paidDate:'2026-04-05' },
      { id:2, employeeId:2, employeeName:'Priya Sharma', category:'UNIFORM',  description:'Apron replacement',     amount:800,  date:'2026-04-05', status:'APPROVED',  approvedBy:'Manager' },
      { id:3, employeeId:3, employeeName:'Ravi Patel',   category:'MEDICAL',  description:'First aid kit restock', amount:620,  date:'2026-04-08', status:'SUBMITTED' },
      { id:4, employeeId:4, employeeName:'Sunita Verma', category:'TRAINING', description:'Food safety course fee', amount:1500, date:'2026-03-20', status:'PAID',      approvedBy:'Manager', paidDate:'2026-03-25' },
      { id:5, employeeId:5, employeeName:'Mohan Das',    category:'FOOD',     description:'Team lunch',            amount:1200, date:'2026-04-10', status:'REJECTED',  notes:'Exceeds limit' },
    ];
    this.cdr.markForCheck();
  }

  get filtered(): ExpenseClaim[] {
    return this.claims.filter(c =>
      (!this.filterStatus   || c.status === this.filterStatus) &&
      (!this.filterCategory || c.category === this.filterCategory) &&
      (!this.filterMonth    || c.date.startsWith(this.filterMonth))
    );
  }

  get totalSubmitted(): number  { return this.claims.filter(c => c.status !== 'DRAFT' && c.status !== 'REJECTED').reduce((s,c) => s + c.amount, 0); }
  get pendingApproval(): number { return this.claims.filter(c => c.status === 'SUBMITTED').length; }
  get totalPaid(): number       { return this.claims.filter(c => c.status === 'PAID').reduce((s,c) => s + c.amount, 0); }

  openAdd(): void {
    this.form = { employeeId:0, category:'TRAVEL', description:'', amount:0, date:new Date().toISOString().split('T')[0], notes:'' };
    this.showModal = true; this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.employeeId || !this.form.amount || !this.form.description) return;
    const emp = this.employees.find(e => e.id === this.form.employeeId);
    this.claims.unshift({ ...this.form, id: this.nextId++, status: 'SUBMITTED', employeeName: emp?.name ?? `#${this.form.employeeId}` });
    this.showModal = false; this.cdr.markForCheck();
  }

  approve(c: ExpenseClaim): void { c.status = 'APPROVED'; c.approvedBy = 'Manager'; this.cdr.markForCheck(); }
  reject(c: ExpenseClaim): void  { c.status = 'REJECTED'; this.cdr.markForCheck(); }
  markPaid(c: ExpenseClaim): void { c.status = 'PAID'; c.paidDate = new Date().toISOString().split('T')[0]; this.cdr.markForCheck(); }

  catIcon(cat: string): string {
    const m: Record<string,string> = { TRAVEL:'directions_bus', FOOD:'restaurant', SUPPLIES:'inventory', UNIFORM:'checkroom', TRAINING:'school', MEDICAL:'local_hospital', OTHER:'receipt' };
    return m[cat] ?? 'receipt';
  }

  statusClass(s: string): string {
    const m: Record<string,string> = { DRAFT:'badge-muted', SUBMITTED:'badge-warn', APPROVED:'badge-info', PAID:'badge-ok', REJECTED:'badge-err' };
    return m[s] ?? 'badge-muted';
  }
}
