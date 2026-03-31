import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentRequest, PaymentResponse } from '../../auth/auth.model';
import { BASE_URL } from '../../../apiUrls';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionServiceService {

  baseUrl= BASE_URL;

  constructor(private readonly httpclient: HttpClient) {}


  doPayment(contact: Omit<PaymentRequest, 'plan'>, selectedPlan: string | null) {
    const paymentReq: PaymentRequest = { ...contact, plan: selectedPlan };
    return this.httpclient.patch<PaymentResponse>(this.baseUrl + '/doPayment', paymentReq);
  }

  upgradePlan(restaurantId: string, planName: string) {
    return this.httpclient.put<any>(
      `${this.baseUrl}/api/subscription/upgrade/${restaurantId}?newPlan=${planName}`,
      {}
    );
  }
}
