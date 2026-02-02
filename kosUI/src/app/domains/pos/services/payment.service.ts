import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  validateSplit(total: number, payments: any[]): boolean {

    const sum = payments.reduce((s, p) => s + Number(p.amount), 0);

    return sum === total;
  }

  getBalance(total: number, payments: any[]): number {

    const sum = payments.reduce((s, p) => s + Number(p.amount), 0);

    return total - sum;
  }

}
