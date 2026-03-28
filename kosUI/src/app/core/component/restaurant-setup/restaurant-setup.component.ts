import { Component } from '@angular/core';
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
export class RestaurantSetupComponent {

  step: 'restaurant' | 'staff' = 'restaurant';
  isLoading = false;
  saveError = '';

  restaurant: RestaurantSetup = {
    restaurantName: '',
    address: '', 
    phone: '', 
    email: '', 
    staff: []
  };

  ngOnInit(){
    const user = this.auth.currentUser;
    console.log('[Setup] currentUser:', user);
    console.log('[Setup] subscriptionPlan:', user?.subscriptionPlan);
    this.restaurant.phone = user?.mobile ?? '';
    this.restaurant.email = user?.email ?? '';
  }

  staffLimitMap: Record<SubscriptionPlan, number> = {
    STARTER: 1, GROWTH: 3, PRO: 10, ENTERPRISE: 15
  };

  availableRoles: UserRole[] = ['MANAGER', 'CASHIER', 'BILLING_ASSISTANT', 'CHEF', 'WAITER'];

  get staffLimit(): number {
    const plan = this.auth.currentUser?.subscriptionPlan;
    return plan ? this.staffLimitMap[plan] : 5;
  }

  get canAddStaff(): boolean {
    return this.restaurant.staff.length < this.staffLimit;
  }

  constructor(private auth: AuthService, private router: Router) {
    this.addStaffRow(); // Start with one row
  }

  addStaffRow(): void {
    if (!this.canAddStaff) return;
    this.restaurant.staff.push({ name: '', mobile: '', email: '', role: 'WAITER' });
  }

  removeStaff(index: number): void {
    this.restaurant.staff.splice(index, 1);
  }

  proceedToStaff(): void {
    if (!this.restaurant.restaurantName || !this.restaurant.phone) return;
    this.step = 'staff';
  }

  completeSetup(): void {
    console.log(this.auth.currentUser?.subscriptionPlan+'Hello')
    this.isLoading = true;
    setTimeout(() => {
      this.auth.updateOnboardingStatus('SETUP_COMPLETE', this.restaurant, this.auth.currentUser?.subscriptionPlan)?.subscribe({
        next: (res) => {
          console.log(res);
          const user = this.auth.currentUser;
        let r = res as MessageResponse;
          if (r.status && user) {
            user.onboardingStatus = 'SETUP_COMPLETE' as OnboardingStatus;
            localStorage.setItem(this.auth.STORAGE_KEY, JSON.stringify(user));
            this.isLoading = false;
            this.router.navigate(['/dashboard']);
          }
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('[completeSetup] DB save failed:', err);
          this.saveError = 'Setup could not be saved. Please try again.';
          this.isLoading = false;
        }
      });
    }, 1000);
  }

  trackByIndex(index: number): number { return index; }
}
