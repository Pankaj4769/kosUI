import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaymentRequest, PaymentResponse, SubscriptionPlan } from '../../auth/auth.model';
import { BASE_URL } from '../../../apiUrls';
import { AuthService } from '../../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionServiceService {

  baseUrl= BASE_URL;

  constructor(
    private readonly httpclient: HttpClient,
    private authService: AuthService
  ) {}


  doPayment(contact: { name: string; email: string; phone: string; restaurantName: string; message: string; }, selectedPlan: string | null){
    let paymentReq: PaymentRequest =contact;
    paymentReq.plan = selectedPlan;
    return this.httpclient.post<PaymentResponse>(this.baseUrl+'/doPayment',paymentReq);
  }
}
