import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: string;
  status: 'ACTIVE' | 'INACTIVE';
  joinDate: Date;
  avatar?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private API_BASE_URL = '/api';
  private staffSubject = new BehaviorSubject<StaffMember[]>([]);
  public staff$ = this.staffSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStaff();
  }

  loadStaff(): void {
    this.http.get<StaffMember[]>(`${this.API_BASE_URL}/staff`)
      .pipe(
        catchError(error => {
          console.error('Failed to load staff, using sample data:', error);
          return of(this.getSampleStaff());
        })
      )
      .subscribe(staff => {
        this.staffSubject.next(staff);
      });
  }

  getStaff(): Observable<StaffMember[]> {
    return this.staff$;
  }

  addStaff(staff: Omit<StaffMember, 'id'>): Observable<StaffMember> {
    const newStaff: StaffMember = {
      ...staff,
      id: `STF-${String(this.staffSubject.value.length + 1).padStart(2, '0')}`
    };

    return this.http.post<StaffMember>(`${this.API_BASE_URL}/staff`, newStaff)
      .pipe(
        catchError(error => {
          console.error('Error adding staff:', error);
          // Local fallback
          const currentStaff = this.staffSubject.value;
          this.staffSubject.next([...currentStaff, newStaff]);
          return of(newStaff);
        }),
        map(savedStaff => {
          const currentStaff = this.staffSubject.value;
          this.staffSubject.next([...currentStaff, savedStaff]);
          return savedStaff;
        })
      );
  }

  updateStaff(id: string, updates: Partial<StaffMember>): Observable<StaffMember> {
    return this.http.put<StaffMember>(`${this.API_BASE_URL}/staff/${id}`, updates)
      .pipe(
        catchError(error => {
          console.error('Error updating staff:', error);
          const currentStaff = this.staffSubject.value;
          const index = currentStaff.findIndex(s => s.id === id);
          if (index !== -1) {
            currentStaff[index] = { ...currentStaff[index], ...updates };
            this.staffSubject.next([...currentStaff]);
          }
          return of(currentStaff[index]);
        }),
        map(updatedStaff => {
          const currentStaff = this.staffSubject.value;
          const index = currentStaff.findIndex(s => s.id === id);
          if (index !== -1) {
            currentStaff[index] = updatedStaff;
            this.staffSubject.next([...currentStaff]);
          }
          return updatedStaff;
        })
      );
  }

  deleteStaff(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/staff/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error deleting staff:', error);
          const currentStaff = this.staffSubject.value.filter(s => s.id !== id);
          this.staffSubject.next(currentStaff);
          return of(undefined);
        }),
        map(() => {
          const currentStaff = this.staffSubject.value.filter(s => s.id !== id);
          this.staffSubject.next(currentStaff);
        })
      );
  }

  private getSampleStaff(): StaffMember[] {
    return [
      {
        id: 'STF-01',
        name: 'Sarah Jenkins',
        email: 'sarah.jenkins@restaurant.com',
        phone: '+91 98765 43210',
        roleId: 1,
        roleName: 'Head Cashier',
        status: 'ACTIVE',
        joinDate: new Date('2024-01-15')
      },
      {
        id: 'STF-02',
        name: 'Marcus Chen',
        email: 'marcus.chen@restaurant.com',
        phone: '+91 98765 43211',
        roleId: 2,
        roleName: 'Executive Chef',
        status: 'ACTIVE',
        joinDate: new Date('2023-11-20')
      }
    ];
  }
}
