import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type PayrollStatus = 'GENERATED' | 'SENT' | 'PENDING';
export type CommissionStatus = 'PENDING' | 'PAID';

export interface SalarySlipView {
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

export interface CommissionRecordView {
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

export interface SalaryKpi {
  totalPayroll: number;
  thisMonth: number;
  processed: number;
  pending: number;
}

export interface CommissionKpi {
  totalSales: number;
  totalCommission: number;
  pending: number;
  paid: number;
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll.component.html',
  styleUrls: ['./payroll.component.css']
})
export class PayrollComponent {
  @Input() salarySlips: SalarySlipView[] = [];
  @Input() salaryKpi!: SalaryKpi;
  @Input() commissionRecords: CommissionRecordView[] = [];
  @Input() commissionKpi!: CommissionKpi;

  @Input() selectedMonth!: string;
  @Input() selectedStaffId: string = '';
  @Input() staffOptions: { id: string; name: string }[] = [];

  @Input() calculator = { salesAmount: 0, rate: 0, commission: 0 };

  @Output() generateSlip = new EventEmitter<void>();
  @Output() downloadSlip = new EventEmitter<string>(); // slipId
  @Output() emailSlip = new EventEmitter<string>();    // slipId
  @Output() payCommission = new EventEmitter<string>(); // recordId
  @Output() calculatorChange = new EventEmitter<{
    salesAmount: number;
    rate: number;
  }>();
  @Output() selectedStaffChange = new EventEmitter<string>();
  @Output() selectedMonthChange = new EventEmitter<string>();

  onGenerateSlip(): void {
    this.generateSlip.emit();
  }

  onDownloadSlip(id: string): void {
    this.downloadSlip.emit(id);
  }

  onEmailSlip(id: string): void {
    this.emailSlip.emit(id);
  }

  onPayCommission(id: string): void {
    this.payCommission.emit(id);
  }

  onCalculatorChange(): void {
    this.calculatorChange.emit({
      salesAmount: this.calculator.salesAmount,
      rate: this.calculator.rate
    });
  }

  onStaffChange(value: string): void {
    this.selectedStaffChange.emit(value);
  }

  onMonthChange(value: string): void {
    this.selectedMonthChange.emit(value);
  }
}
