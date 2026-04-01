import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentRequest, PaymentResponse, SubscriptionPlan } from '../../auth/auth.model';
import { BASE_URL } from '../../../apiUrls';
import { MessageResponse } from '../../../domains/dashboard/models/message.model';

export interface upgradePlan{
  restaurantId: string,
  plan: string
}

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

  upgradePlan(restaurantId?: string, planName?: string) {
    if (!restaurantId || !planName) {
      return;
    }
    
    let plan: upgradePlan = {
      restaurantId: restaurantId,
      plan: planName
    };
    return this.httpclient.patch<MessageResponse>(this.baseUrl+'/upgradePlan', plan);
  }
}
