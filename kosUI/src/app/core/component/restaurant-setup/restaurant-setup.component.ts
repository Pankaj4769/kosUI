import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RestaurantSetup, UserRole, SubscriptionPlan, OnboardingStatus } from '../../../core/auth/auth.model';
import { MessageResponse } from '../../../domains/dashboard/models/message.model';

@Component({
  selector: 'app-restaurant-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './restaurant-setup.component.html',
  styleUrls: ['./restaurant-setup.component.css']
})
export class RestaurantSetupComponent implements OnInit {

  isLoading = false;
  saveError = '';

  onboardingContact: {
    restaurantName: string; email: string; phone: string;
    city: string; state: string;
  } | null = null;

  restaurant: RestaurantSetup = {
    restaurantName: '',
    address: '',
    phone: '',
    email: '',
    staff: []
  };

  staffLimitMap: Record<SubscriptionPlan, number> = {
    STARTER: 1, GROWTH: 3, PRO: 10, ENTERPRISE: 15
  };

  availableRoles: UserRole[] = ['MANAGER', 'CASHIER', 'BILLING_ASSISTANT', 'CHEF', 'WAITER'];

  roleLabels: Partial<Record<UserRole, string>> = {
    MANAGER:           'Manager',
    CASHIER:           'Cashier',
    BILLING_ASSISTANT: 'Billing Assistant',
    CHEF:              'Chef',
    WAITER:            'Waiter'
  };

  get staffLimit(): number {
    const plan = this.auth.currentUser?.subscriptionPlan;
    return plan ? this.staffLimitMap[plan] : 1;
  }

  get canAddStaff(): boolean {
    return this.restaurant.staff.length < this.staffLimit;
  }

  get planName(): string {
    const plan = this.auth.currentUser?.subscriptionPlan ?? '';
    return plan.charAt(0) + plan.slice(1).toLowerCase();
  }

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('kos_onboarding_contact');
    if (stored) {
      try {
        this.onboardingContact = JSON.parse(stored);
        this.restaurant.restaurantName = this.onboardingContact!.restaurantName;
        this.restaurant.phone          = this.onboardingContact!.phone;
        this.restaurant.email          = this.onboardingContact!.email;
      } catch {}
    }
    const user = this.auth.currentUser;
    if (!this.restaurant.phone && user?.mobile) this.restaurant.phone = user.mobile;
    if (!this.restaurant.email && user?.email)  this.restaurant.email = user.email;

    this.addStaffRow();
  }

  addStaffRow(): void {
    if (!this.canAddStaff) return;
    this.restaurant.staff.push({ name: '', mobile: '', email: '', role: 'WAITER' });
  }

  removeStaff(index: number): void {
    this.restaurant.staff.splice(index, 1);
  }

  completeSetup(): void {
    this.saveError = '';
    this.restaurant.staff = this.restaurant.staff.filter(s => s.name.trim() || s.mobile.trim());
    const invalid = this.restaurant.staff.some(s => !s.name.trim() || !s.mobile.trim());
    if (invalid) {
      this.saveError = 'Each staff member must have a name and mobile number.';
      return;
    }
    if (!this.restaurant.restaurantName || !this.restaurant.phone) return;

    this.isLoading = true;
    this.auth.updateOnboardingStatus('SETUP_COMPLETE', this.restaurant, this.auth.currentUser?.subscriptionPlan)?.subscribe({
      next: (res) => {
        const r = res as MessageResponse;
        const user = this.auth.currentUser;
        if (r.status && user) {
          user.onboardingStatus = 'SETUP_COMPLETE' as OnboardingStatus;
          localStorage.setItem(this.auth.STORAGE_KEY, JSON.stringify(user));
          localStorage.removeItem('kos_onboarding_contact');
          this.isLoading = false;
          this.router.navigate(['/dashboard']);
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('[completeSetup] error:', err);
        this.saveError = err?.error?.message ?? 'Setup could not be saved. Please try again.';
        this.isLoading = false;
      }
    });
  }

  trackByIndex(index: number): number { return index; }
}
