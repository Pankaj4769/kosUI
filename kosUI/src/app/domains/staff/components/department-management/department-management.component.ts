import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPLOYEE_MGMT_URL } from '../../../../apiUrls';

export interface Department {
  id?: number;
  name: string;
  description: string;
  createdAt?: string;
}

@Component({
  selector: 'app-department-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './department-management.component.html',
  styleUrls: ['./department-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DepartmentManagementComponent implements OnInit {

  departments: Department[] = [];
  loading = true;
  saving  = false;
  error   = '';

  showModal   = false;
  editingDept: Department | null = null;
  form: Department = { name: '', description: '' };

  deleteTarget: Department | null = null;

  private readonly API = `${EMPLOYEE_MGMT_URL}/api/departments`;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<Department[]>(this.API).subscribe({
      next:  d  => { this.departments = d; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'Failed to load departments.'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openAdd(): void {
    this.editingDept = null;
    this.form = { name: '', description: '' };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEdit(d: Department): void {
    this.editingDept = d;
    this.form = { name: d.name, description: d.description };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.name.trim()) return;
    this.saving = true;
    const req$ = this.editingDept
      ? this.http.put<Department>(`${this.API}/${this.editingDept.id}`, this.form)
      : this.http.post<Department>(this.API, this.form);

    req$.subscribe({
      next: () => { this.saving = false; this.showModal = false; this.load(); },
      error: () => { this.saving = false; this.error = 'Save failed. Please try again.'; this.cdr.markForCheck(); }
    });
  }

  confirmDelete(d: Department): void {
    this.deleteTarget = d;
    this.cdr.markForCheck();
  }

  doDelete(): void {
    if (!this.deleteTarget?.id) return;
    this.http.delete(`${this.API}/${this.deleteTarget.id}`).subscribe({
      next:  () => { this.deleteTarget = null; this.load(); },
      error: () => { this.error = 'Delete failed.'; this.deleteTarget = null; this.cdr.markForCheck(); }
    });
  }

  closeModal(): void { this.showModal = false; this.cdr.markForCheck(); }
}
