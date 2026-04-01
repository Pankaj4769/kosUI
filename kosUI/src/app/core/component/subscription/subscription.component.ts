import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SubscriptionPlan, SubscriptionPlanDetail, PaymentResponse } from '../../../core/auth/auth.model';
import { SubscriptionServiceService } from '../services/subscription-service.service';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.css']
})
export class SubscriptionComponent implements OnInit {

  selectedPlan: SubscriptionPlan | null = null;
  step: 'plan' | 'contact' | 'payment' = 'plan';
  isLoading = false;
  errorMessage: string | null = null;
  billingCycle: 'monthly' | 'annual' = 'monthly';
  openFaq: number | null = null;
  touched: Record<string, boolean> = {};

  contact = {
    name: '', email: '', phone: '', restaurantName: '',
    city: '', state: '', gstNumber: ''
  };

  /* ── Plan Cards ── */
  plans: SubscriptionPlanDetail[] = [
    {
      id: 'STARTER',
      name: 'Starter',
      price: '₹999',
      annualPrice: '₹799',
      period: '/month',
      staffLimit: 1,
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
      staffLimit: 3,
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
      staffLimit: 10,
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
      staffLimit: 15,
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

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private subscriptioService: SubscriptionServiceService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const highlight = params['highlight'] as SubscriptionPlan | undefined;
      if (highlight) {
        this.selectedPlan = highlight;
      }
    });
  }

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
    this.touched = {};
    this.errorMessage = null;
    this.step = 'contact';
  }

  submitContact(): void {
    const { name, email, phone, restaurantName, city, state } = this.contact;
    if (!name || !email || !phone || !restaurantName || !city || !state) return;
    this.errorMessage = null;
    this.step = 'payment';
  }

  submitPayment(): void {
    this.isLoading = true;
    this.errorMessage = null;
    const payload = {
      name:           this.contact.name,
      email:          this.contact.email,
      phone:          this.contact.phone,
      restaurantName: this.contact.restaurantName,
      city:           this.contact.city,
      state:          this.contact.state,
      gstNumber:      this.contact.gstNumber || undefined,
      billingCycle:   this.billingCycle
    };
    this.subscriptioService.doPayment(payload, this.selectedPlan).subscribe({
      next: (res) => {
        const paymentResp = res as PaymentResponse;
        const user = this.auth.currentUser;
        const isUpgrade = user?.onboardingStatus === 'SETUP_COMPLETE';
        if (user) {
          user.subscriptionPlan = paymentResp.activePlan as SubscriptionPlan;
          user.mobile = this.contact.phone;
          user.restaurantId = paymentResp.restaurantId;
          localStorage.setItem(this.auth.STORAGE_KEY, JSON.stringify(user));
        }
        this.isLoading = false;
        if (isUpgrade) {
          this.router.navigate(['/dashboard']);
        } else {
          localStorage.setItem('kos_onboarding_contact', JSON.stringify({
            restaurantName: this.contact.restaurantName,
            email:          this.contact.email,
            phone:          this.contact.phone,
            city:           this.contact.city,
            state:          this.contact.state
          }));
          this.router.navigate(['/onboarding/setup']);
        }
      },
      error: (err: any) => {
        console.error('Payment failed:', err);
        this.errorMessage = err?.error?.message ?? 'Payment failed. Please try again.';
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.errorMessage = null;
    if (this.step === 'payment') {
      this.step = 'contact';
    } else {
      this.touched = {};
      this.step = 'plan';
    }
  }

  get currentPrice(): string {
    const plan = this.getPlanById(this.selectedPlan!);
    if (!plan) return '';
    return this.billingCycle === 'annual' && plan.annualPrice
      ? plan.annualPrice
      : plan.price;
  }

  get totalAmount(): string {
    const plan = this.getPlanById(this.selectedPlan!);
    if (!plan) return '';
    if (this.billingCycle === 'annual' && plan.annualPrice) {
      const monthly = parseInt(plan.annualPrice.replace(/[₹,]/g, ''), 10);
      return '₹' + (monthly * 12).toLocaleString('en-IN');
    }
    return plan.price;
  }

  getPlanById(id: SubscriptionPlan): SubscriptionPlanDetail | undefined {
    return this.plans.find(p => p.id === id);
  }

  getAnnualSaving(plan: SubscriptionPlanDetail): string {
    if (!plan.annualPrice) return '';
    const monthly = parseInt(plan.price.replace(/[₹,]/g, ''), 10);
    const annual  = parseInt(plan.annualPrice.replace(/[₹,]/g, ''), 10);
    const saving  = (monthly - annual) * 12;
    return '₹' + saving.toLocaleString('en-IN');
  }

  get maxAnnualSaving(): string {
    let max = 0;
    this.plans.forEach(p => {
      if (p.annualPrice) {
        const m = parseInt(p.price.replace(/[₹,]/g, ''), 10);
        const a = parseInt(p.annualPrice.replace(/[₹,]/g, ''), 10);
        max = Math.max(max, (m - a) * 12);
      }
    });
    return max > 0 ? '₹' + max.toLocaleString('en-IN') : '';
  }
}
