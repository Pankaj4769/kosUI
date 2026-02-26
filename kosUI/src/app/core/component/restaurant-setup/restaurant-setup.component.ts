import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { RestaurantSetup, StaffSetup, UserRole, SubscriptionPlan } from '../../../core/auth/auth.model';

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

  restaurant: RestaurantSetup = {
    restaurantName: '', address: '', phone: '', email: '', staff: []
  };

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
    this.isLoading = true;
    setTimeout(() => {
      // In real app → POST restaurant + staff details to API
      this.auth.updateOnboardingStatus('SETUP_COMPLETE');
      this.isLoading = false;
      this.router.navigate(['/dashboard']);
    }, 1000);
  }

  trackByIndex(index: number): number { return index; }
}
