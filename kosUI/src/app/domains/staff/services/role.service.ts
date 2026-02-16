import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private API_BASE_URL = '/api';
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  public roles$ = this.rolesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadRoles();
  }

  loadRoles(): void {
    this.http.get<Role[]>(`${this.API_BASE_URL}/roles`)
      .pipe(
        catchError(error => {
          console.error('Failed to load roles, loading sample data:', error);
          return of(this.getSampleRoles());
        })
      )
      .subscribe(roles => {
        this.rolesSubject.next(roles);
      });
  }

  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  addRole(role: Omit<Role, 'id'>): Observable<Role> {
    const newRole: Role = {
      ...role,
      id: this.rolesSubject.value.length > 0 
        ? Math.max(...this.rolesSubject.value.map(r => r.id)) + 1 
        : 1
    };

    return this.http.post<Role>(`${this.API_BASE_URL}/roles`, newRole)
      .pipe(
        catchError(() => {
          const currentRoles = this.rolesSubject.value;
          this.rolesSubject.next([...currentRoles, newRole]);
          return of(newRole);
        }),
        map(savedRole => {
          const currentRoles = this.rolesSubject.value;
          this.rolesSubject.next([...currentRoles, savedRole]);
          return savedRole;
        })
      );
  }

  updateRole(id: number, updates: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.API_BASE_URL}/roles/${id}`, updates)
      .pipe(
        catchError(() => {
          const currentRoles = this.rolesSubject.value;
          const index = currentRoles.findIndex(r => r.id === id);
          if (index !== -1) {
            currentRoles[index] = { ...currentRoles[index], ...updates } as Role;
            this.rolesSubject.next([...currentRoles]);
          }
          return of(currentRoles[index]);
        }),
        map(updatedRole => {
          const currentRoles = this.rolesSubject.value;
          const index = currentRoles.findIndex(r => r.id === id);
          if (index !== -1) {
            currentRoles[index] = updatedRole;
            this.rolesSubject.next([...currentRoles]);
          }
          return updatedRole;
        })
      );
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/roles/${id}`)
      .pipe(
        catchError(() => {
          const currentRoles = this.rolesSubject.value.filter(r => r.id !== id);
          this.rolesSubject.next(currentRoles);
          return of(undefined);
        }),
        map(() => {
          const currentRoles = this.rolesSubject.value.filter(r => r.id !== id);
          this.rolesSubject.next(currentRoles);
        })
      );
  }

  private getSampleRoles(): Role[] {
    return [
      {
        id: 1,
        name: 'Restaurant Manager',
        description: 'Full access to all restaurant operations',
        permissions: [
          'menu.view', 'menu.create', 'menu.edit', 'menu.delete',
          'order.view', 'order.create', 'order.update', 'order.cancel',
          'staff.view', 'staff.create', 'staff.edit', 'staff.delete',
          'report.view', 'report.export', 'analytics.view',
          'settings.view', 'settings.edit'
        ]
      },
      {
        id: 2,
        name: 'Executive Chef',
        description: 'Manages kitchen operations and menu',
        permissions: ['menu.view', 'menu.create', 'menu.edit', 'order.view', 'order.update']
      },
      {
        id: 3,
        name: 'Head Cashier',
        description: 'Manages billing and customer checkout',
        permissions: ['order.view', 'order.create', 'report.view']
      },
      {
        id: 4,
        name: 'Waitstaff',
        description: 'Takes orders and serves customers',
        permissions: ['menu.view', 'order.view', 'order.create', 'order.update']
      },
      {
        id: 5,
        name: 'Kitchen Staff',
        description: 'Prepares food orders',
        permissions: ['order.view', 'order.update']
      }
    ];
  }
}
