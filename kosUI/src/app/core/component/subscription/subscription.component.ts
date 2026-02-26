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
  billingCycle: 'monthly' | 'annual' = 'monthly';
  openFaq: number | null = null;

  contact = {
    name: '', email: '', phone: '', restaurantName: '', message: ''
  };

  /* ── Plan Cards ── */
  plans: SubscriptionPlanDetail[] = [
    {
      id: 'STARTER',
      name: 'Starter',
      price: '₹999',
      annualPrice: '₹799',
      period: '/month',
      staffLimit: 5,
      positioning: 'For Small Cafes',
      tagline: 'Essential tools to get started',
      features: [
        'Inventory Dashboard',
        'Menu & Cashier Panel',
        'Tax Configuration',
        'Sales Reports'
      ]
    },
    {
      id: 'GROWTH',
      name: 'Growth',
      price: '₹1,999',
      annualPrice: '₹1,599',
      period: '/month',
      staffLimit: 15,
      positioning: 'For Growing Restaurants',
      tagline: 'Orders & operations unlocked',
      features: [
        'Everything in Starter',
        'Table & Live Order Management',
        'Split Billing & QR Codes',
        'Expense & Inventory Reports'
      ]
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: '₹3,499',
      annualPrice: '₹2,799',
      period: '/month',
      staffLimit: 50,
      popular: true,
      positioning: 'For High-Volume Kitchens',
      tagline: 'Full power, full team',
      features: [
        'Everything in Growth',
        'Employee & Role Management',
        'Kitchen Display System (KDS)',
        'Payment Gateway & Loyalty Program'
      ]
    },
    {
      id: 'ENTERPRISE',
      name: 'Enterprise',
      price: '₹5,999',
      annualPrice: '₹4,799',
      period: '/month',
      staffLimit: 999,
      positioning: 'For Multi-Branch & Chains',
      tagline: 'Enterprise without limits',
      features: [
        'Everything in Pro',
        'Multi-Branch & API Access',
        'White-Label Branding',
        'Restaurant Website Builder'
      ]
    }
  ];

  /* ── 52-Feature Comparison Table ── */
  comparisonCategories = [
    {
      category: 'Inventory & Stock Management',
      icon: 'inventory_2',
      rows: [
        { label: 'Inventory Dashboard',        plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'Add / Edit Stock Items',      plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'Low Stock Alerts',            plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Stock Adjustment Logs',       plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Supplier Management',         plans: ['PRO','ENTERPRISE'] },
        { label: 'Purchase Order Management',   plans: ['PRO','ENTERPRISE'] },
        { label: 'Waste Tracking',              plans: ['PRO','ENTERPRISE'] },
        { label: 'Raw Material Cost Tracking',  plans: ['PRO','ENTERPRISE'] },
        { label: 'Multi-Location Inventory',    plans: ['ENTERPRISE'] },
      ]
    },
    {
      category: 'POS & Billing System',
      icon: 'point_of_sale',
      rows: [
        { label: 'Menu Management',             plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'Category & Modifier Setup',   plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Cashier Panel',               plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'Split Billing',               plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Discount & Coupon Support',   plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Tax Configuration',           plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'Multi-Terminal POS',          plans: ['PRO','ENTERPRISE'] },
        { label: 'Offline Billing Mode',        plans: ['ENTERPRISE'] },
      ]
    },
    {
      category: 'Order Management',
      icon: 'receipt_long',
      rows: [
        { label: 'Table Management',            plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Live Order Tracking',         plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Order History',               plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Kitchen Display System (KDS)',plans: ['PRO','ENTERPRISE'] },
        { label: 'Online Order Integration',    plans: ['PRO','ENTERPRISE'] },
        { label: 'Delivery Partner Integration',plans: ['ENTERPRISE'] },
        { label: 'Multi-Branch Order Sync',     plans: ['ENTERPRISE'] },
      ]
    },
    {
      category: 'Employee & Role Management',
      icon: 'groups',
      rows: [
        { label: 'Staff Directory',             plans: ['PRO','ENTERPRISE'] },
        { label: 'Employee Management',         plans: ['PRO','ENTERPRISE'] },
        { label: 'Attendance Tracking',         plans: ['PRO','ENTERPRISE'] },
        { label: 'Leave Management',            plans: ['PRO','ENTERPRISE'] },
        { label: 'Salary & Payroll',            plans: ['PRO','ENTERPRISE'] },
        { label: 'Shift Scheduling',            plans: ['PRO','ENTERPRISE'] },
        { label: 'Role-Based Access Control',   plans: ['PRO','ENTERPRISE'] },
        { label: 'Activity Logs',               plans: ['PRO','ENTERPRISE'] },
        { label: 'Multi-Branch Staff Access',   plans: ['ENTERPRISE'] },
      ]
    },
    {
      category: 'Reports & Analytics',
      icon: 'bar_chart',
      rows: [
        { label: 'Sales Reports',               plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'Expense Reports',             plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Inventory Reports',           plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Profit & Loss Reports',       plans: ['PRO','ENTERPRISE'] },
        { label: 'Staff Performance Reports',   plans: ['PRO','ENTERPRISE'] },
        { label: 'Advanced Analytics Dashboard',plans: ['ENTERPRISE'] },
        { label: 'Custom Report Builder',       plans: ['ENTERPRISE'] },
      ]
    },
    {
      category: 'System & Automation',
      icon: 'settings',
      rows: [
        { label: 'Settings & Configurations',   plans: ['STARTER','GROWTH','PRO','ENTERPRISE'] },
        { label: 'QR Code for Tables',          plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'SMS / Email Notifications',   plans: ['GROWTH','PRO','ENTERPRISE'] },
        { label: 'Automated Daily Reports',     plans: ['PRO','ENTERPRISE'] },
        { label: 'API Access',                  plans: ['ENTERPRISE'] },
        { label: 'White-Label Branding',        plans: ['ENTERPRISE'] },
        { label: 'Priority Support',            plans: ['ENTERPRISE'] },
      ]
    },
    {
      category: 'Add-ons & Growth Tools',
      icon: 'rocket_launch',
      rows: [
        { label: 'Online Payment Gateway',      plans: ['PRO','ENTERPRISE'] },
        { label: 'Loyalty & Rewards Program',   plans: ['PRO','ENTERPRISE'] },
        { label: 'Restaurant Website Builder',  plans: ['ENTERPRISE'] },
        { label: 'Custom Domain Support',       plans: ['ENTERPRISE'] },
        { label: 'Marketing Campaign Tools',    plans: ['ENTERPRISE'] },
        { label: 'Multi-Location Management',   plans: ['ENTERPRISE'] },
      ]
    }
  ];

  /* ── Testimonials ── */
  testimonials = [
    {
      name: 'Arjun Mehta', role: 'GM, Cloud Spice',
      text: 'Kitchen Book transformed our multi-outlet operations. Real-time reporting saved us hours every day.'
    },
    {
      name: 'Priya Sharma', role: 'Owner, Biryani House',
      text: 'Inventory tracking alone paid for the subscription within the first month. Brilliant product.'
    },
    {
      name: 'Rahul Nair', role: 'MD, FreshBowl Chain',
      text: 'Kitchen errors dropped 80% after switching to Kitchen Book. The KDS integration is flawless.'
    }
  ];

  /* ── FAQ ── */
  faqs = [
    {
      q: 'Can I upgrade my plan later?',
      a: 'Yes, you can upgrade anytime. Changes take effect from the next billing cycle with prorated charges.'
    },
    {
      q: 'Is there a free trial available?',
      a: 'We offer a 7-day free trial on all plans. No credit card required to get started.'
    },
    {
      q: 'How many POS terminals can I use?',
      a: 'All plans support unlimited billing terminals under one subscription at no extra cost.'
    },
    {
      q: 'What payment methods are accepted?',
      a: 'We accept UPI, credit/debit cards, net banking and NEFT/RTGS transfers.'
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. All data is encrypted at rest and in transit. We are ISO 27001 compliant.'
    }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  selectPlan(plan: SubscriptionPlan): void { this.selectedPlan = plan; }

  setBilling(cycle: 'monthly' | 'annual'): void { this.billingCycle = cycle; }

  toggleBilling(): void {
    this.billingCycle = this.billingCycle === 'monthly' ? 'annual' : 'monthly';
  }

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
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
