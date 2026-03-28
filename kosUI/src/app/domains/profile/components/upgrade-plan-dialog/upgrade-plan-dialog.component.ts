import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { BASE_URL } from '../../../../apiUrls';
import { AuthService } from '../../../../core/auth/auth.service';
import { SubscriptionPlan } from '../../../../core/auth/auth.model';

export interface UpgradePlanDialogData {
  planKey: SubscriptionPlan;
  planLabel: string;
  planPrice: string;
  planFeatures: string[];
}

type PaymentTab = 'card' | 'upi';

@Component({
  selector: 'app-upgrade-plan-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './upgrade-plan-dialog.component.html',
  styleUrls: ['./upgrade-plan-dialog.component.css']
})
export class UpgradePlanDialogComponent implements OnInit {

  step: 'payment' | 'processing' | 'success' | 'error' = 'payment';
  paymentTab: PaymentTab = 'card';

  // Card fields
  cardNumber = '';
  cardName   = '';
  cardExpiry = '';
  cardCvv    = '';

  // UPI field
  upiId = '';

  errorMessage = '';

  constructor(
    public dialogRef: MatDialogRef<UpgradePlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UpgradePlanDialogData,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  get isCardValid(): boolean {
    return this.cardNumber.replace(/\s/g, '').length === 16
      && this.cardName.trim().length > 0
      && /^\d{2}\/\d{2}$/.test(this.cardExpiry)
      && this.cardCvv.length === 3;
  }

  get isUpiValid(): boolean {
    return /^[\w.\-]+@[\w]+$/.test(this.upiId.trim());
  }

  get canSubmit(): boolean {
    return this.paymentTab === 'card' ? this.isCardValid : this.isUpiValid;
  }

  formatCardNumber(val: string): void {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    this.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry(val: string): void {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    this.cardExpiry = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
  }

  pay(): void {
    if (!this.canSubmit) return;
    this.step = 'processing';

    const user = this.authService.currentUser;
    const restaurantId = user?.restaurantId;

    if (!restaurantId) {
      this.errorMessage = 'Restaurant not found. Please contact support.';
      this.step = 'error';
      return;
    }

    this.http.put<unknown>(
      `${BASE_URL}/api/subscription/upgrade/${restaurantId}`,
      null,
      { params: { newPlan: this.data.planKey } }
    ).subscribe({
      next: () => {
        this.applyUpgrade(this.data.planKey);
        this.step = 'success';
      },
      error: () => {
        this.errorMessage = 'Upgrade failed. Please try again or contact support.';
        this.step = 'error';
      }
    });
  }

  private applyUpgrade(plan: SubscriptionPlan): void {
    const stored = localStorage.getItem(this.authService.STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored);
      user.subscriptionPlan = plan;
      localStorage.setItem(this.authService.STORAGE_KEY, JSON.stringify(user));
    }
  }

  close(upgraded = false): void {
    this.dialogRef.close(upgraded);
  }

  retry(): void {
    this.step = 'payment';
    this.errorMessage = '';
  }
}
