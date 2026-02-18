import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionPlan, SubscriptionPlanDetail } from '../../../core/auth/auth.model';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.css']
})
export class SubscriptionComponent {

  selectedPlan: SubscriptionPlan | null = null;
  step: 'plan' | 'contact' = 'plan';
  isLoading = false;
  successMessage = '';

  contact = {
    name: '', email: '', phone: '', restaurantName: '', message: ''
  };

  plans: SubscriptionPlanDetail[] = [
    {
      id: 'BASIC',
      name: 'Basic',
      price: '₹999',
      period: '/month',
      staffLimit: 5,
      features: [
        'Up to 5 staff accounts',
        'POS & Order Management',
        'Basic Inventory',
        'Email Support'
      ]
    },
    {
      id: 'BASIC_PLUS',
      name: 'Basic+',
      price: '₹1,999',
      period: '/month',
      staffLimit: 15,
      features: [
        'Up to 15 staff accounts',
        'All Basic features',
        'Attendance & Leave',
        'Salary Management',
        'Priority Email Support'
      ]
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      price: '₹3,499',
      period: '/month',
      staffLimit: 50,
      popular: true,
      features: [
        'Up to 50 staff accounts',
        'All Basic+ features',
        'Advanced Analytics',
        'QR Code Ordering',
        'Phone & Email Support',
        'Custom Reports'
      ]
    },
    {
      id: 'ULTRA',
      name: 'Ultra',
      price: '₹5,999',
      period: '/month',
      staffLimit: 999,
      features: [
        'Unlimited staff accounts',
        'All Premium features',
        'Full UI Customization',
        'Dedicated Account Manager',
        'White-label Option',
        '24/7 Priority Support'
      ]
    }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  selectPlan(plan: SubscriptionPlan): void {
    this.selectedPlan = plan;
  }

  proceedToContact(): void {
    if (!this.selectedPlan) return;
    const user = this.auth.currentUser;
    if (user) {
      this.contact.name  = user.name;
      this.contact.email = user.email ?? '';
      this.contact.phone = user.mobile ?? '';
    }
    this.step = 'contact';
  }

  submitContact(): void {
    if (!this.contact.name || !this.contact.email || !this.contact.phone) return;
    this.isLoading = true;
    setTimeout(() => {
      // In real app → POST to API with plan + contact details
      this.auth.updateOnboardingStatus('PENDING_APPROVAL', this.selectedPlan!);
      this.isLoading = false;
      this.router.navigate(['/onboarding/pending']);
    }, 1000);
  }

  goBack(): void { this.step = 'plan'; }

  getPlanById(id: SubscriptionPlan): SubscriptionPlanDetail | undefined {
    return this.plans.find(p => p.id === id);
  }
}
