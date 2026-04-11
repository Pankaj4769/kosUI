import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EMPLOYEE_MGMT_URL } from '../../../apiUrls';
import { SalarySlip, CommissionRecord, CommissionStatus } from '../models/payroll.model';

interface SalarySlipDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  month: string;
  basicSalary: number;
  hra: number;
  shiftAllowance: number;
  leaveDeductions: number;
  commission: number;
  bonus: number;
  grossSalary: number;
  pf: number;
  tax: number;
  netSalary: number;
  status: string;
  generatedDate: string;
  paymentDate?: string;
}

interface CommissionDTO {
  id: number;
  employeeId: number;
  employeeName: string;
  month: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  paidDate?: string;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly SLIP_API = `${EMPLOYEE_MGMT_URL}/api/payroll/salary-slips`;
  private readonly COMM_API = `${EMPLOYEE_MGMT_URL}/api/payroll/commissions`;

  constructor(private http: HttpClient) {}

  getSalarySlips(month: string): Observable<SalarySlip[]> {
    return this.http.get<SalarySlipDTO[]>(`${this.SLIP_API}/month/${month}`).pipe(
      map(list => list.map(this.toSalarySlip)),
      catchError(err => {
        console.error('Failed to load salary slips:', err);
        return of([]);
      })
    );
  }

  getSalarySlipsByEmployee(employeeId: string): Observable<SalarySlip[]> {
    return this.http.get<SalarySlipDTO[]>(`${this.SLIP_API}/employee/${employeeId}`).pipe(
      map(list => list.map(this.toSalarySlip)),
      catchError(() => of([]))
    );
  }

  generateSalarySlip(slip: Partial<SalarySlip> & { employeeId: string; month: string }): Observable<SalarySlip> {
    const payload = {
      employeeId: Number(slip.employeeId),
      month: slip.month,
      basicSalary: slip.basicSalary ?? 0,
      hra: slip.hra ?? 0,
      shiftAllowance: (slip as any).shiftAllowance ?? 0,
      leaveDeductions: (slip as any).leaveDeductions ?? 0,
      commission: slip.commission ?? 0,
      bonus: slip.bonus ?? 0,
      pf: slip.pf ?? 0,
      tax: slip.tax ?? 0
    };
    return this.http.post<SalarySlipDTO>(this.SLIP_API, payload).pipe(
      map(this.toSalarySlip),
      catchError(err => {
        console.error('Failed to generate salary slip:', err);
        return of({} as SalarySlip);
      })
    );
  }

  updateSlipStatus(slipId: string, status: string): Observable<SalarySlip> {
    return this.http.patch<SalarySlipDTO>(
      `${this.SLIP_API}/${slipId}/status?status=${status}`, {}
    ).pipe(map(this.toSalarySlip));
  }

  getCommissionRecords(month: string): Observable<CommissionRecord[]> {
    return this.http.get<CommissionDTO[]>(`${this.COMM_API}/month/${month}`).pipe(
      map(list => list.map(this.toCommissionRecord)),
      catchError(err => {
        console.error('Failed to load commissions:', err);
        return of([]);
      })
    );
  }

  getCommissionsByEmployee(employeeId: string): Observable<CommissionRecord[]> {
    return this.http.get<CommissionDTO[]>(`${this.COMM_API}/employee/${employeeId}`).pipe(
      map(list => list.map(this.toCommissionRecord)),
      catchError(() => of([]))
    );
  }

  addCommission(employeeId: string, month: string, salesAmount: number, commissionRate: number): Observable<CommissionRecord> {
    return this.http.post<CommissionDTO>(this.COMM_API, {
      employeeId: Number(employeeId), month, salesAmount, commissionRate
    }).pipe(map(this.toCommissionRecord));
  }

  markCommissionPaid(record: CommissionRecord): Observable<CommissionRecord> {
    return this.http.patch<CommissionDTO>(`${this.COMM_API}/${record.id}/pay`, {}).pipe(
      map(this.toCommissionRecord),
      catchError(err => {
        console.error('Failed to mark commission paid:', err);
        // Optimistic local update
        return of({ ...record, status: 'PAID' as CommissionStatus, paidDate: new Date() });
      })
    );
  }

  downloadSalarySlip(slipId: string): void {
    console.log('Download salary slip', slipId);
    // TODO: implement file download when backend supports it
  }

  emailSalarySlip(slipId: string): void {
    console.log('Email salary slip', slipId);
    // TODO: implement email when backend supports it
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private toSalarySlip(dto: SalarySlipDTO): SalarySlip {
    return {
      id: String(dto.id),
      staffId: String(dto.employeeId),
      staffName: dto.employeeName ?? '',
      month: dto.month,
      basicSalary: dto.basicSalary,
      hra: dto.hra,
      shiftAllowance: dto.shiftAllowance ?? 0,
      leaveDeductions: dto.leaveDeductions ?? 0,
      commission: dto.commission,
      bonus: dto.bonus,
      grossSalary: dto.grossSalary,
      pf: dto.pf,
      tax: dto.tax,
      deductions: dto.pf + dto.tax + (dto.leaveDeductions ?? 0),
      netSalary: dto.netSalary,
      status: dto.status as any,
      generatedDate: new Date(dto.generatedDate),
      paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined
    };
  }

  private toCommissionRecord(dto: CommissionDTO): CommissionRecord {
    return {
      id: String(dto.id),
      staffId: String(dto.employeeId),
      staffName: dto.employeeName ?? '',
      salesAmount: dto.salesAmount,
      commissionRate: dto.commissionRate,
      commissionAmount: dto.commissionAmount,
      month: dto.month,
      status: dto.status as CommissionStatus,
      paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined
    };
  }
}
