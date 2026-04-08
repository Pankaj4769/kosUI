import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentData } from '../components/payment-popup/payment-popup.component';
import { BASE_URL } from '../../../apiUrls';
import { MessageResponse } from '../../dashboard/models/message.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(
    private httpClient: HttpClient
  ) {
    
  }
  private baseUrl = BASE_URL;

  validateSplit(total: number, payments: any[]): boolean {

    const sum = payments.reduce((s, p) => s + Number(p.amount), 0);

    return sum === total;
  }

  getBalance(total: number, payments: any[]): number {

    const sum = payments.reduce((s, p) => s + Number(p.amount), 0);

    return total - sum;
  }

  processPayment(data: PaymentData){
    return this.httpClient.post<MessageResponse>(this.baseUrl+'/doBillPayment',data);
  }

}
