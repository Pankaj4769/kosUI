import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BASE_URL, EMPLOYEE_MGMT_URL } from '../../../apiUrls';

export interface StaffMember {
  id: string;         // KOS staffId — primary key
  emId?: string;      // EM employee id — used for EM CRUD calls
  name: string;
  email: string;
  phone: string;
  roleId: number;
  roleName: string;
  departmentId?: number;
  departmentName?: string;
  position?: string;
  salary?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  joinDate: Date;
  createdAt?: string;
  updatedAt?: string;
  avatar?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

// Personal info from KOS /auth/staff/{restaurantId}
interface KosStaffDTO {
  staffId: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  restaurantId: string;
}

// Employment info from EM /api/employees — id = KOS staff id
interface EmployeeDTO {
  id: number;           // = KOS staff id
  position: string;
  departmentId: number;
  departmentName: string;
  salary: number;
  status: string;
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly EM_API = `${EMPLOYEE_MGMT_URL}/api/employees`;
  private readonly KOS_STAFF_API = `${EMPLOYEE_MGMT_URL}/auth/staff`;

  private staffSubject = new BehaviorSubject<StaffMember[]>([]);
  public staff$ = this.staffSubject.asObservable();

  constructor(private http: HttpClient) {
    // Defer initial load — caller should invoke loadStaff(restaurantId)
  }

  loadStaff(restaurantId: string): void {
    combineLatest([
      this.http.get<KosStaffDTO[]>(`${this.KOS_STAFF_API}/${restaurantId}`).pipe(
        catchError(err => { console.error('Failed to load KOS staff:', err); return of([]); })
      ),
      this.http.get<EmployeeDTO[]>(this.EM_API).pipe(
        catchError(err => { console.error('Failed to load EM employees:', err); return of([]); })
      )
    ]).pipe(
      map(([kosStaff, emEmployees]) => this.mergeStaff(kosStaff, emEmployees))
    ).subscribe(staff => this.staffSubject.next(staff));
  }

  private mergeStaff(kosStaff: KosStaffDTO[], emEmployees: EmployeeDTO[]): StaffMember[] {
    const emByKosId = new Map<number, EmployeeDTO>();
    emEmployees.forEach(e => emByKosId.set(e.id, e));

    return kosStaff.map(k => {
      const em = emByKosId.get(k.staffId);
      return {
        id: String(k.staffId),
        emId: em ? String(em.id) : undefined,
        name: k.name ?? '',
        email: k.email ?? '',
        phone: k.mobile ?? '',
        roleId: 0,
        roleName: k.role ?? '',
        departmentId: em?.departmentId,
        departmentName: em?.departmentName,
        position: em?.position,
        salary: em?.salary,
        status: (em?.status ?? 'ACTIVE') as StaffMember['status'],
        joinDate: em?.hireDate ? new Date(em.hireDate) : new Date(),
        createdAt: em?.createdAt,
        updatedAt: em?.updatedAt
      };
    });
  }

  getStaff(): Observable<StaffMember[]> {
    return this.staff$;
  }

  addStaff(staff: Omit<StaffMember, 'id'> & { staffId: number }): Observable<StaffMember> {
    const payload = this.toEmployeeRequest(staff);
    return this.http.post<EmployeeDTO>(this.EM_API, payload).pipe(
      map(dto => {
        const saved: StaffMember = {
          ...staff,
          id: String(staff.staffId),
          emId: String(dto.id),
          status: (dto.status ?? 'ACTIVE') as StaffMember['status'],
          joinDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt
        };
        this.staffSubject.next([...this.staffSubject.value, saved]);
        return saved;
      })
    );
  }

  updateStaff(emId: string, updates: Partial<StaffMember>): Observable<StaffMember> {
    const payload = this.toEmployeeRequest(updates as StaffMember);
    return this.http.put<EmployeeDTO>(`${this.EM_API}/${emId}`, payload).pipe(
      map(dto => {
        const updated: Partial<StaffMember> = {
          emId: String(dto.id),
          departmentId: dto.departmentId,
          departmentName: dto.departmentName,
          position: dto.position,
          salary: dto.salary,
          status: (dto.status ?? 'ACTIVE') as StaffMember['status'],
          joinDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt
        };
        const list = this.staffSubject.value.map(s =>
          s.emId === emId ? { ...s, ...updated } : s
        );
        this.staffSubject.next(list);
        return list.find(s => s.emId === emId)!;
      }),
      catchError(error => {
        console.error('Error updating staff:', error);
        const list = this.staffSubject.value;
        const index = list.findIndex(s => s.emId === emId);
        if (index !== -1) {
          list[index] = { ...list[index], ...updates };
          this.staffSubject.next([...list]);
          return of(list[index]);
        }
        return of(updates as StaffMember);
      })
    );
  }

  deleteStaff(emId: string): Observable<void> {
    return this.http.delete<void>(`${this.EM_API}/${emId}`).pipe(
      tap(() => this.staffSubject.next(this.staffSubject.value.filter(s => s.emId !== emId))),
      catchError(error => {
        console.error('Error deleting staff:', error);
        this.staffSubject.next(this.staffSubject.value.filter(s => s.emId !== emId));
        return of(undefined);
      })
    );
  }

  // ─── KOS: create staff login account ─────────────────────────────────────

  addStaffToKos(payload: {
    name: string; email: string; mobile: string;
    role: string; restaurantId: string;
  }): Observable<{ staffId: number }> {
    return this.http.post<{ staffId: number }>(`${BASE_URL}/auth/addStaff`, payload);
  }

  resendTempPassword(username: string): Observable<{ message: string; status: boolean }> {
    return this.http.post<{ message: string; status: boolean }>(`${BASE_URL}/auth/resendTempPassword`, { username });
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private toEmployeeRequest(staff: Partial<StaffMember> & { staffId?: number }): object {
    const realDeptId = (staff.departmentId && staff.departmentId > 0) ? staff.departmentId : undefined;
    return {
      staffId: staff.staffId,
      position: staff.position ?? staff.roleName,
      departmentId: realDeptId,
      departmentName: staff.departmentName,   // always send — used when deptId is predefined (negative)
      salary: staff.salary,
      status: staff.status,
      hireDate: staff.joinDate
        ? new Date(staff.joinDate).toISOString().split('T')[0]
        : undefined
    };
  }
}
