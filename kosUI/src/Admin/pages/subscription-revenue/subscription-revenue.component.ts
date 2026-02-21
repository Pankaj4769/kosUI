import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  PaymentFilterPipe,
  RefundFilterPipe,
  RegionFilterPipe
} from './subscription-revenue.pipes';

// ── Interfaces ──────────────────────────────────────────
export type PlanStatus     = 'active' | 'paused' | 'archived';
export type BillingCycle   = 'Monthly' | 'Quarterly' | 'Yearly';
export type PaymentStatus  = 'success' | 'failed' | 'refunded' | 'pending';
export type RegionCode     = 'IN' | 'US' | 'EU' | 'SEA';

export interface SubscriptionPlan {
  id: number;
  name: string;
  tagline: string;
  status: PlanStatus;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  trialDays: number;
  maxStaff: number;
  maxOrders: number;
  storageGB: number;
  features: string[];
  activeSubscribers: number;
  mrr: number;
  usageBilling: boolean;
  regionalPricing: RegionalPrice[];
  color: string;
}

export interface RegionalPrice {
  region: RegionCode;
  currency: string;
  price: number;
}

export interface PromoCode {
  id: number;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  usedCount: number;
  maxUses: number;
  expiryDate: string;
  status: 'active' | 'expired' | 'exhausted';
  applicablePlans: string[];
}

export interface PaymentLog {
  id: number;
  tenantName: string;
  restaurantName: string;
  plan: string;
  amount: string;
  status: PaymentStatus;
  date: string;
  failureReason?: string;
  invoiceId: string;
}

export interface RefundRequest {
  id: number;
  tenantName: string;
  plan: string;
  amount: string;
  requestDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  invoiceId: string;
}

export interface TaxConfig {
  region: RegionCode;
  taxName: string;
  rate: number;
  active: boolean;
  registrationNo: string;
}

export interface RevenueMetric {
  label: string;
  value: string;
  rawValue: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  trendLabel: string;
  iconBg: string;
  iconColor: string;
  iconKey: string;
}

// ── Component ──────────────────────────────────────────
@Component({
  selector: 'app-subscription-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PaymentFilterPipe, RefundFilterPipe, RegionFilterPipe],
  templateUrl: './subscription-revenue.component.html',
  styleUrls: ['./subscription-revenue.component.css']
})
export class SubscriptionRevenueComponent implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────
  activeTab             = 'plans';
  showPlanModal         = false;
  showPromoModal        = false;
  showTaxModal          = false;
  showRefundModal       = false;
  showInvoiceModal      = false;
  showPriceEditModal    = false;
  selectedPlan: SubscriptionPlan | null = null;
  selectedLog: PaymentLog | null        = null;
  selectedRefund: RefundRequest | null  = null;
  editingPrice          = 0;
  today                 = '';
  private pollTimer: any;

    // ── Nav ────────────────────────────────────────────
  navItems = [
    { label: 'Dashboard',       route: '/admin',                    active: false },
    { label: 'User',            route: '/admin/users',              active: false },
    { label: 'Subscription',    route: '/admin/subscriptions',      active: true },
    { label: 'Security',        route: '/admin/security',           active: false },
    { label: 'Notifications',   route: '/admin/notifications',      active: false },
    { label: 'RBAC',            route: '/admin/rbac',               active: false },
    { label: 'Products',        route: '/admin/products',           active: false },
    { label: 'Configuration',   route: '/admin/configuration',      active: false },
    { label: 'AI Control',      route: '/admin/ai-control',         active: false },
    // { label: 'System Monitoring', route: '/admin/system-monitoring', active: false },
  ];

  // ── Tabs ──────────────────────────────────────────
  tabs = [
    { key: 'plans',    label: 'Plans'            },
    { key: 'revenue',  label: 'Revenue Analytics'},
    { key: 'promos',   label: 'Promo Codes'      },
    { key: 'payments', label: 'Payment Logs'     },
    { key: 'refunds',  label: 'Refunds'          },
    { key: 'tax',      label: 'GST / Tax'        },
    { key: 'regional', label: 'Regional Pricing' },
  ];

  // ── Revenue Metrics ───────────────────────────────
  revenueMetrics: RevenueMetric[] = [
    {
      label: 'Monthly Recurring Revenue', value: '₹4,28,400', rawValue: 428400,
      trend: 'up', trendValue: '18.2%', trendLabel: 'vs last month',
      iconBg: '#F5F3FF', iconColor: '#7C3AED', iconKey: 'mrr'
    },
    {
      label: 'Annual Recurring Revenue', value: '₹51,40,800', rawValue: 5140800,
      trend: 'up', trendValue: '22.4%', trendLabel: 'vs last year',
      iconBg: '#EFF6FF', iconColor: '#2563EB', iconKey: 'arr'
    },
    {
      label: 'Active Subscriptions', value: '1,147', rawValue: 1147,
      trend: 'up', trendValue: '24', trendLabel: 'new this month',
      iconBg: '#F0FDF4', iconColor: '#16A34A', iconKey: 'subs'
    },
    {
      label: 'Churn Rate', value: '2.3%', rawValue: 2.3,
      trend: 'down', trendValue: '0.4%', trendLabel: 'improvement',
      iconBg: '#FFF1F2', iconColor: '#E11D48', iconKey: 'churn'
    },
    {
      label: 'Avg Revenue Per User', value: '₹1,248', rawValue: 1248,
      trend: 'up', trendValue: '₹86', trendLabel: 'vs last month',
      iconBg: '#ECFDF5', iconColor: '#059669', iconKey: 'arpu'
    },
    {
      label: 'Payment Failures', value: '14', rawValue: 14,
      trend: 'down', trendValue: '6', trendLabel: 'fewer than last month',
      iconBg: '#FFF7ED', iconColor: '#EA580C', iconKey: 'failures'
    },
  ];

  // ── Plans ─────────────────────────────────────────
  plans: SubscriptionPlan[] = [
    {
      id: 1, name: 'Basic', tagline: 'Perfect for small cafes',
      status: 'active', billingCycle: 'Monthly', price: 299, currency: '₹',
      trialDays: 14, maxStaff: 5, maxOrders: 500, storageGB: 1,
      features: ['POS', 'Menu Management', 'Basic Reports', 'Email Support'],
      activeSubscribers: 342, mrr: 102258, usageBilling: false,
      regionalPricing: [
        { region: 'IN', currency: '₹', price: 299 },
        { region: 'US', currency: '$', price: 5   },
        { region: 'EU', currency: '€', price: 4   },
      ],
      color: '#475569'
    },
    {
      id: 2, name: 'Basic+', tagline: 'For growing restaurants',
      status: 'active', billingCycle: 'Monthly', price: 999, currency: '₹',
      trialDays: 14, maxStaff: 15, maxOrders: 2000, storageGB: 5,
      features: ['POS', 'Menu Management', 'Advanced Reports', 'KDS', 'Table Management', 'Phone Support'],
      activeSubscribers: 289, mrr: 288711, usageBilling: false,
      regionalPricing: [
        { region: 'IN', currency: '₹', price: 999  },
        { region: 'US', currency: '$', price: 15   },
        { region: 'EU', currency: '€', price: 13   },
      ],
      color: '#16A34A'
    },
    {
      id: 3, name: 'Premium', tagline: 'For established chains',
      status: 'active', billingCycle: 'Monthly', price: 1499, currency: '₹',
      trialDays: 30, maxStaff: 50, maxOrders: 10000, storageGB: 20,
      features: ['All Basic+', 'Multi-branch', 'Analytics Dashboard', 'API Access', 'Priority Support', 'Custom Branding'],
      activeSubscribers: 342, mrr: 512658, usageBilling: true,
      regionalPricing: [
        { region: 'IN', currency: '₹', price: 1499 },
        { region: 'US', currency: '$', price: 25   },
        { region: 'EU', currency: '€', price: 22   },
        { region: 'SEA', currency: '$', price: 18  },
      ],
      color: '#2563EB'
    },
    {
      id: 4, name: 'Ultra', tagline: 'Enterprise + Custom',
      status: 'active', billingCycle: 'Yearly', price: 36000, currency: '₹',
      trialDays: 30, maxStaff: 200, maxOrders: 999999, storageGB: 100,
      features: ['All Premium', 'Dedicated Server', 'Custom Integrations', 'White-label', 'SLA 99.99%', '24/7 Support', 'Data Migration'],
      activeSubscribers: 174, mrr: 522000, usageBilling: true,
      regionalPricing: [
        { region: 'IN', currency: '₹', price: 36000 },
        { region: 'US', currency: '$', price: 499   },
        { region: 'EU', currency: '€', price: 449   },
        { region: 'SEA', currency: '$', price: 349  },
      ],
      color: '#7C3AED'
    },
  ];

  // ── Promo Codes ───────────────────────────────────
  promoCodes: PromoCode[] = [
    {
      id: 1, code: 'LAUNCH50', type: 'percent', value: 50,
      usedCount: 142, maxUses: 200, expiryDate: '2026-03-31',
      status: 'active', applicablePlans: ['Basic', 'Basic+']
    },
    {
      id: 2, code: 'FLAT500', type: 'flat', value: 500,
      usedCount: 89, maxUses: 100, expiryDate: '2026-02-28',
      status: 'active', applicablePlans: ['Premium', 'Ultra']
    },
    {
      id: 3, code: 'DIWALI30', type: 'percent', value: 30,
      usedCount: 300, maxUses: 300, expiryDate: '2025-11-15',
      status: 'exhausted', applicablePlans: ['Basic', 'Basic+', 'Premium']
    },
    {
      id: 4, code: 'NEWYEAR25', type: 'percent', value: 25,
      usedCount: 67, maxUses: 500, expiryDate: '2026-01-15',
      status: 'expired', applicablePlans: ['Basic', 'Basic+', 'Premium', 'Ultra']
    },
  ];

  // ── Expiry Tracking ───────────────────────────────
  expiryAlerts = [
    { tenantName: 'Cafe Bliss',         plan: 'Basic',   expiresIn: 3,  renewalAmt: '₹299'  },
    { tenantName: 'Zaiqa Biryani',      plan: 'Basic+',  expiresIn: 5,  renewalAmt: '₹999'  },
    { tenantName: 'Masala Junction',    plan: 'Premium',  expiresIn: 7,  renewalAmt: '₹1,499'},
    { tenantName: 'The Rice Bowl',      plan: 'Basic',   expiresIn: 12, renewalAmt: '₹299'  },
    { tenantName: 'Burger Factory',     plan: 'Basic+',  expiresIn: 14, renewalAmt: '₹999'  },
  ];

  // ── Payment Logs ──────────────────────────────────
  paymentLogs: PaymentLog[] = [
    {
      id: 1, tenantName: 'Rajesh Kumar', restaurantName: 'Spice Bloom',
      plan: 'Premium', amount: '₹1,499', status: 'success',
      date: '2026-02-20 09:41', invoiceId: 'INV-2026-0841'
    },
    {
      id: 2, tenantName: 'Priya Sharma', restaurantName: 'The Tandoori House',
      plan: 'Ultra', amount: '₹3,000', status: 'success',
      date: '2026-02-20 08:15', invoiceId: 'INV-2026-0840'
    },
    {
      id: 3, tenantName: 'Mohammed Iqbal', restaurantName: 'Zaiqa Biryani',
      plan: 'Basic+', amount: '₹999', status: 'failed',
      date: '2026-02-19 22:30', failureReason: 'Insufficient funds',
      invoiceId: 'INV-2026-0839'
    },
    {
      id: 4, tenantName: 'Sunita Reddy', restaurantName: 'Cafe Bliss',
      plan: 'Basic', amount: '₹299', status: 'pending',
      date: '2026-02-19 18:00', invoiceId: 'INV-2026-0838'
    },
    {
      id: 5, tenantName: 'Arjun Nair', restaurantName: 'Salt & Pepper',
      plan: 'Premium', amount: '₹1,499', status: 'refunded',
      date: '2026-02-18 14:22', invoiceId: 'INV-2026-0831'
    },
    {
      id: 6, tenantName: 'Divya Menon', restaurantName: 'Green Bowl',
      plan: 'Basic', amount: '₹299', status: 'failed',
      date: '2026-02-17 11:10', failureReason: 'Card expired',
      invoiceId: 'INV-2026-0825'
    },
    {
      id: 7, tenantName: 'Karthik Raj', restaurantName: 'Dosa Corner',
      plan: 'Basic+', amount: '₹999', status: 'success',
      date: '2026-02-17 10:05', invoiceId: 'INV-2026-0824'
    },
    {
      id: 8, tenantName: 'Meera Pillai', restaurantName: 'Kerala Kitchen',
      plan: 'Premium', amount: '₹1,499', status: 'success',
      date: '2026-02-16 16:45', invoiceId: 'INV-2026-0820'
    },
  ];

  // ── Refund Requests ───────────────────────────────
  refundRequests: RefundRequest[] = [
    {
      id: 1, tenantName: 'Arjun Nair', plan: 'Premium', amount: '₹1,499',
      requestDate: '2026-02-18', reason: 'Duplicate payment charged twice',
      status: 'approved', invoiceId: 'INV-2026-0831'
    },
    {
      id: 2, tenantName: 'Santosh Gupta', plan: 'Basic+', amount: '₹999',
      requestDate: '2026-02-15', reason: 'Cancelled within trial window',
      status: 'pending', invoiceId: 'INV-2026-0810'
    },
    {
      id: 3, tenantName: 'Leela Das', plan: 'Basic', amount: '₹299',
      requestDate: '2026-02-10', reason: 'Accidental subscription',
      status: 'rejected', invoiceId: 'INV-2026-0795'
    },
  ];

  // ── Tax Config ────────────────────────────────────
  taxConfigs: TaxConfig[] = [
    { region: 'IN', taxName: 'GST (CGST + SGST)', rate: 18, active: true,  registrationNo: '27AAPFU0939F1ZV' },
    { region: 'US', taxName: 'Sales Tax',          rate: 0,  active: false, registrationNo: 'N/A'             },
    { region: 'EU', taxName: 'VAT',                rate: 20, active: true,  registrationNo: 'EU826010263'     },
    { region: 'SEA', taxName: 'GST/VAT (SEA)',     rate: 9,  active: true,  registrationNo: 'M2-0012345-X'   },
  ];

  // ── Plan Form (new plan modal) ────────────────────
  newPlan = {
    name: '', tagline: '', price: 0, billingCycle: 'Monthly' as BillingCycle,
    trialDays: 14, maxStaff: 5, maxOrders: 500, storageGB: 1,
    usageBilling: false, features: ''
  };

  // ── Promo Form ────────────────────────────────────
  newPromo = {
    code: '', type: 'percent' as 'percent' | 'flat', value: 0,
    maxUses: 100, expiryDate: '', applicablePlans: 'Basic'
  };

  // ── Revenue chart data (simplified bar values) ────
  mrrTrend = [
    { month: 'Sep', value: 290000 },
    { month: 'Oct', value: 318000 },
    { month: 'Nov', value: 342000 },
    { month: 'Dec', value: 368000 },
    { month: 'Jan', value: 398400 },
    { month: 'Feb', value: 428400 },
  ];

  get mrrMax(): number { return Math.max(...this.mrrTrend.map(m => m.value)); }

  mrrBarHeight(value: number): number {
    return Math.round((value / this.mrrMax) * 100);
  }

  planDistribution = [
    { name: 'Basic',   count: 342, color: '#94A3B8' },
    { name: 'Basic+',  count: 289, color: '#16A34A'  },
    { name: 'Premium', count: 342, color: '#2563EB'  },
    { name: 'Ultra',   count: 174, color: '#7C3AED'  },
  ];
  get totalSubscribers(): number { return this.planDistribution.reduce((a, b) => a + b.count, 0); }
  planBarWidth(count: number): number { return Math.round((count / this.totalSubscribers) * 100); }

  // ── Lifecycle ─────────────────────────────────────
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    this.pollTimer = setInterval(() => this.simulateLiveRevenue(), 4000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private simulateLiveRevenue(): void {
    const delta = Math.floor(Math.random() * 2000) - 500;
    this.revenueMetrics[0].rawValue = Math.max(400000, this.revenueMetrics[0].rawValue + delta);
    this.revenueMetrics[0].value = '₹' + (this.revenueMetrics[0].rawValue / 1000).toFixed(1) + 'K';
  }

  // ── Actions ───────────────────────────────────────
  setTab(key: string): void { this.activeTab = key; }

  openPlanModal(plan?: SubscriptionPlan): void {
    this.selectedPlan = plan ? { ...plan } : null;
    this.showPlanModal = true;
  }

  closePlanModal(): void { this.showPlanModal = false; this.selectedPlan = null; }

  togglePlanStatus(plan: SubscriptionPlan): void {
    plan.status = plan.status === 'active' ? 'paused' : 'active';
  }

  openPriceEdit(plan: SubscriptionPlan): void {
    this.selectedPlan  = { ...plan };
    this.editingPrice  = plan.price;
    this.showPriceEditModal = true;
  }

  confirmPriceChange(): void {
    if (!this.selectedPlan) return;
    const p = this.plans.find(x => x.id === this.selectedPlan!.id);
    if (p) {
      p.price = this.editingPrice;
      p.mrr   = p.price * p.activeSubscribers;
    }
    this.showPriceEditModal = false;
  }

  changeBillingCycle(plan: SubscriptionPlan, cycle: BillingCycle): void {
    plan.billingCycle = cycle;
  }

  openPromoModal(): void { this.showPromoModal = true; }
  closePromoModal(): void { this.showPromoModal = false; }

  addPromoCode(): void {
    if (!this.newPromo.code.trim()) return;
    this.promoCodes.unshift({
      id: Date.now(), code: this.newPromo.code.toUpperCase(),
      type: this.newPromo.type, value: this.newPromo.value,
      usedCount: 0, maxUses: this.newPromo.maxUses,
      expiryDate: this.newPromo.expiryDate, status: 'active',
      applicablePlans: [this.newPromo.applicablePlans]
    });
    this.closePromoModal();
  }

  deactivatePromo(promo: PromoCode): void { promo.status = 'expired'; }

  openInvoiceModal(log: PaymentLog): void {
    this.selectedLog = { ...log };
    this.showInvoiceModal = true;
  }

  closeInvoiceModal(): void { this.showInvoiceModal = false; this.selectedLog = null; }

  downloadInvoice(): void {
    if (!this.selectedLog) return;
    const content = `INVOICE\n\n${this.selectedLog.invoiceId}\nTenant: ${this.selectedLog.tenantName}\nPlan: ${this.selectedLog.plan}\nAmount: ${this.selectedLog.amount}\nDate: ${this.selectedLog.date}\nStatus: ${this.selectedLog.status}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${this.selectedLog.invoiceId}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  openRefundModal(refund: RefundRequest): void {
    this.selectedRefund  = { ...refund };
    this.showRefundModal = true;
  }

  approveRefund(): void {
    if (!this.selectedRefund) return;
    const r = this.refundRequests.find(x => x.id === this.selectedRefund!.id);
    if (r) r.status = 'approved';
    this.showRefundModal = false;
  }

  rejectRefund(): void {
    if (!this.selectedRefund) return;
    const r = this.refundRequests.find(x => x.id === this.selectedRefund!.id);
    if (r) r.status = 'rejected';
    this.showRefundModal = false;
  }

  toggleTax(tax: TaxConfig): void { tax.active = !tax.active; }

  openTaxModal(): void  { this.showTaxModal = true; }
  closeTaxModal(): void { this.showTaxModal = false; }

  closeAllModals(): void {
    this.showPlanModal = this.showPromoModal = this.showTaxModal =
    this.showRefundModal = this.showInvoiceModal = this.showPriceEditModal = false;
  }

  // ── Helpers ───────────────────────────────────────
  getPaymentStatusClass(s: string): string {
    const m: Record<string, string> = {
      success: 'ps-success', failed: 'ps-failed',
      refunded: 'ps-refunded', pending: 'ps-pending'
    };
    return m[s] || '';
  }

  getRefundStatusClass(s: string): string {
    const m: Record<string, string> = {
      pending: 'rs-pending', approved: 'rs-approved', rejected: 'rs-rejected'
    };
    return m[s] || '';
  }

  getPromoStatusClass(s: string): string {
    const m: Record<string, string> = {
      active: 'promo-active', expired: 'promo-expired', exhausted: 'promo-exhausted'
    };
    return m[s] || '';
  }

  getExpiryClass(days: number): string {
    if (days <= 3)  return 'expiry-critical';
    if (days <= 7)  return 'expiry-warning';
    return 'expiry-normal';
  }

  getPlanBadgeClass(name: string): string {
    const m: Record<string, string> = {
      'Basic': 'plan-basic', 'Basic+': 'plan-basic-plus',
      'Premium': 'plan-premium', 'Ultra': 'plan-ultra'
    };
    return m[name] || '';
  }

  formatMRR(value: number): string {
    return '₹' + (value / 1000).toFixed(1) + 'K';
  }
  hasRegion(plan: SubscriptionPlan, region: string): boolean {
  return plan.regionalPricing.some(rp => rp.region === region);
}
}
