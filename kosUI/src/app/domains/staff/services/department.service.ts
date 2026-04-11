import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EMPLOYEE_MGMT_URL } from '../../../apiUrls';

export interface Department {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private readonly API = `${EMPLOYEE_MGMT_URL}/api/departments`;

  private deptSubject = new BehaviorSubject<Department[]>([]);
  public departments$ = this.deptSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.http.get<Department[]>(this.API).pipe(
      catchError(err => {
        console.error('Failed to load departments:', err);
        return of([]);
      })
    ).subscribe(d => this.deptSubject.next(d));
  }

  getDepartments(): Observable<Department[]> {
    return this.departments$;
  }

  getDepartmentById(id: number): Observable<Department> {
    return this.http.get<Department>(`${this.API}/${id}`);
  }

  createDepartment(dept: Omit<Department, 'id' | 'createdAt'>): Observable<Department> {
    return this.http.post<Department>(this.API, dept).pipe(
      tap(saved => this.deptSubject.next([...this.deptSubject.value, saved]))
    );
  }

  updateDepartment(id: number, dept: Omit<Department, 'id' | 'createdAt'>): Observable<Department> {
    return this.http.put<Department>(`${this.API}/${id}`, dept).pipe(
      tap(updated => {
        const list = this.deptSubject.value.map(d => d.id === id ? updated : d);
        this.deptSubject.next(list);
      })
    );
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`).pipe(
      tap(() => this.deptSubject.next(this.deptSubject.value.filter(d => d.id !== id)))
    );
  }
}
