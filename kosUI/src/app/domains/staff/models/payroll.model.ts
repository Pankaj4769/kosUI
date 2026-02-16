// src/app/domains/staff/models/payroll.model.ts

export type PayrollStatus = 'GENERATED' | 'SENT' | 'PENDING';

export interface SalarySlip {
  id: string;
  staffId: string;
  staffName: string;
  month: string;
  basicSalary: number;
  hra: number;
  commission: number;
  bonus: number;
  grossSalary: number;
  pf: number;
  tax: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  generatedDate: Date;
}

export type CommissionStatus = 'PENDING' | 'PAID';

export interface CommissionRecord {
  id: string;
  staffId: string;
  staffName: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
  month: string;
  status: CommissionStatus;
  paidDate?: Date;
}
