// src/app/domains/staff/services/payroll.service.ts

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  CommissionRecord,
  SalarySlip,
  CommissionStatus
} from '../models/payroll.model';
import { StaffMember } from '../services/staff.service';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  constructor() {}

  getSalarySlips(
    staff: StaffMember[],
    month: string
  ): Observable<SalarySlip[]> {
    const slips: SalarySlip[] = staff.slice(0, 10).map((s, index) => {
      const basicSalary = 35000 + index * 5000;
      const hra = basicSalary * 0.2;
      const commission = Math.floor(Math.random() * 10000);
      const bonus = Math.floor(Math.random() * 5000);
      const grossSalary = basicSalary + hra + commission + bonus;
      const pf = basicSalary * 0.12;
      const tax = grossSalary * 0.05;
      const deductions = pf + tax;
      const netSalary = grossSalary - deductions;

      return {
        id: `SAL-${index + 1}`,
        staffId: s.id,
        staffName: s.name,
        month,
        basicSalary,
        hra,
        commission,
        bonus,
        grossSalary,
        pf,
        tax,
        deductions,
        netSalary,
        status: Math.random() > 0.3 ? 'SENT' : 'PENDING',
        generatedDate: new Date()
      };
    });

    return of(slips);
  }

  getCommissionRecords(
    staff: StaffMember[],
    month: string
  ): Observable<CommissionRecord[]> {
    const records: CommissionRecord[] = staff.slice(0, 10).map((s, idx) => ({
      id: `COM-${idx + 1}`,
      staffId: s.id,
      staffName: s.name,
      salesAmount: Math.floor(Math.random() * 100000) + 20000,
      commissionRate: Math.floor(Math.random() * 8) + 3,
      commissionAmount: 0,
      month,
      status: Math.random() > 0.5 ? 'PAID' : 'PENDING'
    }));

    records.forEach((r) => {
      r.commissionAmount = (r.salesAmount * r.commissionRate) / 100;
    });

    return of(records);
  }

  markCommissionPaid(
    record: CommissionRecord
  ): CommissionRecord {
    if (record.status === 'PENDING') {
      return {
        ...record,
        status: 'PAID' as CommissionStatus,
        paidDate: new Date()
      };
    }
    return record;
  }

  // Stub methods for actions – can be implemented later with HTTP
  generateSalarySlipForStaff(staffId: string, month: string): Observable<void> {
    return of(void 0);
  }

  downloadSalarySlip(slipId: string): void {
    // TODO integrate with backend/file API
    console.log('Download salary slip', slipId);
  }

  emailSalarySlip(slipId: string): void {
    console.log('Email salary slip', slipId);
  }
}
