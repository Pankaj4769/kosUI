import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type ProductStatus = 'active' | 'inactive' | 'archived';
export type PricingType   = 'fixed' | 'dynamic' | 'tiered';
export type RolloutStage  = 'draft' | 'rolling' | 'full' | 'paused';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  status: ProductStatus;
  price: number;
  pricingType: PricingType;
  stock: number;
  lowStockThreshold: number;
  assignedPlans: string[];
  imageInitial: string;
  createdAt: string;
}

export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  visibleToPlans: string[];
  tenantOverrides: number;
  category: string;
  lastModified: string;
}

export interface ABTest {
  id: number;
  name: string;
  hypothesis: string;
  variantA: string;
  variantB: string;
  splitPct: number;
  status: 'running' | 'paused' | 'completed';
  startedAt: string;
  conversionA: number;
  conversionB: number;
  participantCount: number;
}

export interface RolloutConfig {
  id: number;
  featureName: string;
  description: string;
  stage: RolloutStage;
  rolloutPct: number;
  targetPlans: string[];
  affectedTenants: number;
  startedAt: string;
  completedAt: string;
}

@Component({
  selector: 'app-product-feature',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-feature.component.html',
  styleUrls: ['./product-feature.component.css']
})
export class ProductFeatureComponent implements OnInit {

  protected readonly Math = Math; 
  activeTab = 'products';
  today = '';

  tabs = [
    { key: 'products',    label: 'Products'          },
    { key: 'inventory',   label: 'Inventory'         },
    { key: 'pricing',     label: 'Dynamic Pricing'   },
    { key: 'flags',       label: 'Feature Flags'     },
    { key: 'visibility',  label: 'Visibility'        },
    { key: 'abtesting',   label: 'A/B Testing'       },
    { key: 'rollout',     label: 'Gradual Rollout'   },
  ];

  allPlans = ['Basic', 'Basic+', 'Premium', 'Ultra'];

  /* ── Summary Stats ── */
  stats = [
    { label: 'Total Products',   value: '38',    sub: '34 active',        iconBg: '#EFF6FF', iconColor: '#2563EB' },
    { label: 'Feature Flags',    value: '24',    sub: '18 enabled',       iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { label: 'Active A/B Tests', value: '3',     sub: '2 running',        iconBg: '#FEF3C7', iconColor: '#D97706' },
    { label: 'Rolling Out',      value: '5',     sub: '1 at 10%',         iconBg: '#F0FDF4', iconColor: '#16A34A' },
    { label: 'Low Stock Items',  value: '6',     sub: 'Needs attention',  iconBg: '#FFF1F2', iconColor: '#E11D48' },
    { label: 'Dynamic Prices',   value: '12',    sub: 'Auto-adjusting',   iconBg: '#ECFDF5', iconColor: '#059669' },
  ];

  /* ── Products ── */
  products: Product[] = [
    {
      id: 1, name: 'POS Terminal', description: 'Full-featured point of sale system',
      category: 'Core', status: 'active', price: 1999, pricingType: 'fixed',
      stock: 999, lowStockThreshold: 10, assignedPlans: ['Basic','Premium','Ultra'],
      imageInitial: 'P', createdAt: '2025-01-10'
    },
    {
      id: 2, name: 'KDS Display', description: 'Kitchen display screen integration',
      category: 'Kitchen', status: 'active', price: 1499, pricingType: 'fixed',
      stock: 80, lowStockThreshold: 20, assignedPlans: ['Premium','Ultra'],
      imageInitial: 'K', createdAt: '2025-02-14'
    },
    {
      id: 3, name: 'Inventory Manager', description: 'Smart stock tracking & alerts',
      category: 'Operations', status: 'active', price: 799, pricingType: 'tiered',
      stock: 150, lowStockThreshold: 30, assignedPlans: ['Basic+','Premium','Ultra'],
      imageInitial: 'I', createdAt: '2025-03-01'
    },
    {
      id: 4, name: 'WhatsApp Notifier', description: 'Real-time order WhatsApp alerts',
      category: 'Notifications', status: 'active', price: 499, pricingType: 'dynamic',
      stock: 200, lowStockThreshold: 50, assignedPlans: ['Premium','Ultra'],
      imageInitial: 'W', createdAt: '2025-04-20'
    },
    {
      id: 5, name: 'Analytics Pro', description: 'Advanced reports & business insights',
      category: 'Reporting', status: 'active', price: 1299, pricingType: 'dynamic',
      stock: 999, lowStockThreshold: 10, assignedPlans: ['Ultra'],
      imageInitial: 'A', createdAt: '2025-05-05'
    },
    {
      id: 6, name: 'Table Reservation', description: 'Online booking & table management',
      category: 'Frontend', status: 'inactive', price: 699, pricingType: 'fixed',
      stock: 40, lowStockThreshold: 15, assignedPlans: ['Premium','Ultra'],
      imageInitial: 'T', createdAt: '2025-06-11'
    },
    {
      id: 7, name: 'Loyalty Program', description: 'Points & rewards for customers',
      category: 'Marketing', status: 'active', price: 599, pricingType: 'tiered',
      stock: 300, lowStockThreshold: 50, assignedPlans: ['Basic+','Premium','Ultra'],
      imageInitial: 'L', createdAt: '2025-07-18'
    },
    {
      id: 8, name: 'Multi-Branch Manager', description: 'Manage multiple restaurant branches',
      category: 'Enterprise', status: 'active', price: 2499, pricingType: 'tiered',
      stock: 25, lowStockThreshold: 10, assignedPlans: ['Ultra'],
      imageInitial: 'M', createdAt: '2025-08-02'
    },
  ];

  showProductModal = false;
  editingProduct: Product | null = null;

  productForm: Omit<Product, 'id' | 'createdAt' | 'imageInitial'> = {
    name: '', description: '', category: 'Core', status: 'active',
    price: 0, pricingType: 'fixed', stock: 0, lowStockThreshold: 10,
    assignedPlans: []
  };

  categories = ['Core', 'Kitchen', 'Operations', 'Notifications', 'Reporting', 'Frontend', 'Marketing', 'Enterprise'];

  /* ── Feature Flags ── */
  featureFlags: FeatureFlag[] = [
    {
      id: 1, key: 'whatsapp_notifications', name: 'WhatsApp Notifications',
      description: 'Send order alerts via WhatsApp Business API',
      enabled: true, visibleToPlans: ['Premium','Ultra'],
      tenantOverrides: 12, category: 'Notifications', lastModified: '2026-02-18'
    },
    {
      id: 2, key: 'ai_demand_forecast', name: 'AI Demand Forecasting',
      description: 'Predict ingredient demand using ML models',
      enabled: true, visibleToPlans: ['Ultra'],
      tenantOverrides: 3, category: 'AI', lastModified: '2026-02-15'
    },
    {
      id: 3, key: 'multi_currency', name: 'Multi-Currency Support',
      description: 'Accept payments in multiple currencies',
      enabled: false, visibleToPlans: ['Premium','Ultra'],
      tenantOverrides: 0, category: 'Billing', lastModified: '2026-02-10'
    },
    {
      id: 4, key: 'dark_mode', name: 'Dark Mode UI',
      description: 'Toggle dark theme across the dashboard',
      enabled: true, visibleToPlans: ['Basic','Basic+','Premium','Ultra'],
      tenantOverrides: 48, category: 'UI', lastModified: '2026-02-19'
    },
    {
      id: 5, key: 'advanced_reports', name: 'Advanced Analytics Reports',
      description: 'Custom date range reports and CSV export',
      enabled: true, visibleToPlans: ['Premium','Ultra'],
      tenantOverrides: 7, category: 'Reporting', lastModified: '2026-02-17'
    },
    {
      id: 6, key: 'loyalty_engine', name: 'Loyalty Engine v2',
      description: 'Next-gen points, tiers, and reward redemptions',
      enabled: false, visibleToPlans: ['Basic+','Premium','Ultra'],
      tenantOverrides: 0, category: 'Marketing', lastModified: '2026-01-30'
    },
    {
      id: 7, key: 'api_webhooks', name: 'Outbound Webhooks',
      description: 'Push real-time events to external systems',
      enabled: true, visibleToPlans: ['Premium','Ultra'],
      tenantOverrides: 22, category: 'Integrations', lastModified: '2026-02-12'
    },
    {
      id: 8, key: 'two_factor_auth', name: '2FA Enforcement',
      description: 'Require two-factor authentication for staff logins',
      enabled: true, visibleToPlans: ['Basic','Basic+','Premium','Ultra'],
      tenantOverrides: 5, category: 'Security', lastModified: '2026-02-20'
    },
  ];

  flagCategories = ['All','AI','Billing','Integrations','Marketing','Notifications','Reporting','Security','UI'];
  activeFlagCategory = 'All';

  /* ── A/B Tests ── */
  abTests: ABTest[] = [
    {
      id: 1, name: 'Checkout Button Colour',
      hypothesis: 'Green CTA increases checkout completion vs blue',
      variantA: 'Blue #2563EB Button', variantB: 'Green #16A34A Button',
      splitPct: 50, status: 'running', startedAt: '2026-02-10',
      conversionA: 18.4, conversionB: 24.1, participantCount: 3420
    },
    {
      id: 2, name: 'Onboarding Flow Length',
      hypothesis: '3-step onboarding reduces drop-off vs 6-step',
      variantA: '6-Step Onboarding', variantB: '3-Step Onboarding',
      splitPct: 50, status: 'running', startedAt: '2026-02-14',
      conversionA: 61.2, conversionB: 74.8, participantCount: 1890
    },
    {
      id: 3, name: 'Plan Pricing Display',
      hypothesis: 'Monthly price anchoring increases upgrades',
      variantA: 'Annual price shown', variantB: 'Monthly price shown',
      splitPct: 40, status: 'paused', startedAt: '2026-02-01',
      conversionA: 8.2, conversionB: 11.6, participantCount: 950
    },
    {
      id: 4, name: 'Dashboard Widget Layout',
      hypothesis: 'Card layout has better engagement than table layout',
      variantA: 'Table layout', variantB: 'Card layout',
      splitPct: 50, status: 'completed', startedAt: '2026-01-15',
      conversionA: 34.0, conversionB: 51.2, participantCount: 5240
    },
  ];

  /* ── Rollout ── */
  rollouts: RolloutConfig[] = [
    {
      id: 1, featureName: 'AI Smart Suggestions',
      description: 'AI-powered menu item recommendations during order creation',
      stage: 'rolling', rolloutPct: 10,
      targetPlans: ['Premium','Ultra'], affectedTenants: 52,
      startedAt: '2026-02-20', completedAt: ''
    },
    {
      id: 2, featureName: 'New KDS Interface v3',
      description: 'Redesigned kitchen display screen with drag-and-drop order management',
      stage: 'rolling', rolloutPct: 35,
      targetPlans: ['Premium','Ultra'], affectedTenants: 182,
      startedAt: '2026-02-15', completedAt: ''
    },
    {
      id: 3, featureName: 'Loyalty Engine v2',
      description: 'Points, tiers, and reward redemptions with gamification',
      stage: 'rolling', rolloutPct: 65,
      targetPlans: ['Basic+','Premium','Ultra'], affectedTenants: 486,
      startedAt: '2026-02-10', completedAt: ''
    },
    {
      id: 4, featureName: 'WhatsApp Business API v2',
      description: 'Next-gen WhatsApp integration with rich media support',
      stage: 'full', rolloutPct: 100,
      targetPlans: ['Premium','Ultra'], affectedTenants: 516,
      startedAt: '2026-02-01', completedAt: '2026-02-18'
    },
    {
      id: 5, featureName: 'Dark Mode',
      description: 'System-wide dark theme support',
      stage: 'paused', rolloutPct: 20,
      targetPlans: ['Basic','Basic+','Premium','Ultra'], affectedTenants: 230,
      startedAt: '2026-02-12', completedAt: ''
    },
  ];

  /* ── Dynamic Pricing Rules ── */
  pricingRules = [
    {
      id: 1, product: 'Analytics Pro', rule: 'Usage-based scaling',
      basePrice: 1299, maxPrice: 2499, trigger: 'API calls > 50k/month',
      currentPrice: 1799, active: true
    },
    {
      id: 2, product: 'WhatsApp Notifier', rule: 'Volume discount',
      basePrice: 499, maxPrice: 499, trigger: 'Messages > 10k → 20% off',
      currentPrice: 399, active: true
    },
    {
      id: 3, product: 'Multi-Branch Manager', rule: 'Seat-based pricing',
      basePrice: 2499, maxPrice: 4999, trigger: 'Per additional branch',
      currentPrice: 3249, active: true
    },
    {
      id: 4, product: 'Inventory Manager', rule: 'Tiered plan discount',
      basePrice: 799, maxPrice: 799, trigger: 'Ultra plan gets 30% off',
      currentPrice: 559, active: false
    },
  ];

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  /* ── Product Actions ── */
  setTab(k: string): void { this.activeTab = k; }

  openAddProduct(): void {
    this.editingProduct = null;
    this.productForm = {
      name: '', description: '', category: 'Core', status: 'active',
      price: 0, pricingType: 'fixed', stock: 0,
      lowStockThreshold: 10, assignedPlans: []
    };
    this.showProductModal = true;
  }

  openEditProduct(p: Product): void {
    this.editingProduct = p;
    this.productForm = {
      name: p.name, description: p.description, category: p.category,
      status: p.status, price: p.price, pricingType: p.pricingType,
      stock: p.stock, lowStockThreshold: p.lowStockThreshold,
      assignedPlans: [...p.assignedPlans]
    };
    this.showProductModal = true;
  }

  saveProduct(): void {
    if (!this.productForm.name.trim()) return;
    if (this.editingProduct) {
      Object.assign(this.editingProduct, this.productForm);
    } else {
      this.products.push({
        id: Date.now(),
        ...this.productForm,
        imageInitial: this.productForm.name[0].toUpperCase(),
        createdAt: new Date().toISOString().split('T')[0]
      });
    }
    this.showProductModal = false;
  }

  deleteProduct(p: Product): void {
    this.products = this.products.filter(x => x.id !== p.id);
  }

  toggleProductStatus(p: Product): void {
    p.status = p.status === 'active' ? 'inactive' : 'active';
  }

  togglePlan(plan: string): void {
    const i = this.productForm.assignedPlans.indexOf(plan);
    if (i === -1) this.productForm.assignedPlans.push(plan);
    else          this.productForm.assignedPlans.splice(i, 1);
  }

  isPlanSelected(plan: string): boolean {
    return this.productForm.assignedPlans.includes(plan);
  }

  /* ── Flag Actions ── */
  toggleFlag(f: FeatureFlag): void { f.enabled = !f.enabled; }

  toggleFlagPlan(f: FeatureFlag, plan: string): void {
    const i = f.visibleToPlans.indexOf(plan);
    if (i === -1) f.visibleToPlans.push(plan);
    else          f.visibleToPlans.splice(i, 1);
  }

  /* ── Rollout Actions ── */
  increaseRollout(r: RolloutConfig, step = 10): void {
    r.rolloutPct = Math.min(100, r.rolloutPct + step);
    if (r.rolloutPct === 100) {
      r.stage = 'full';
      r.completedAt = new Date().toISOString().split('T')[0];
    }
  }

  pauseRollout(r: RolloutConfig): void {
    r.stage = r.stage === 'paused' ? 'rolling' : 'paused';
  }

  /* ── Helpers ── */
  get filteredFlags(): FeatureFlag[] {
    if (this.activeFlagCategory === 'All') return this.featureFlags;
    return this.featureFlags.filter(f => f.category === this.activeFlagCategory);
  }

  get lowStockProducts(): Product[] {
    return this.products.filter(p => p.stock <= p.lowStockThreshold);
  }

  get activeProductCount(): number {
    return this.products.filter(p => p.status === 'active').length;
  }

  get enabledFlagCount(): number {
    return this.featureFlags.filter(f => f.enabled).length;
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = {
      active: 'ps-active', inactive: 'ps-inactive', archived: 'ps-archived'
    };
    return m[s] ?? 'ps-inactive';
  }

  getPricingClass(t: string): string {
    const m: Record<string, string> = {
      fixed: 'pt-fixed', dynamic: 'pt-dynamic', tiered: 'pt-tiered'
    };
    return m[t] ?? 'pt-fixed';
  }

  getRolloutStageClass(s: string): string {
    const m: Record<string, string> = {
      draft: 'rs-draft', rolling: 'rs-rolling', full: 'rs-full', paused: 'rs-paused'
    };
    return m[s] ?? 'rs-draft';
  }

  getABStatusClass(s: string): string {
    const m: Record<string, string> = {
      running: 'ab-running', paused: 'ab-paused', completed: 'ab-completed'
    };
    return m[s] ?? 'ab-paused';
  }

  getRolloutBarColor(pct: number): string {
    return pct === 100 ? '#16A34A' : pct >= 50 ? '#2563EB' : '#D97706';
  }

  getWinnerVariant(t: ABTest): string {
    if (t.status !== 'completed') return '';
    return t.conversionB > t.conversionA ? 'B' : 'A';
  }
}
