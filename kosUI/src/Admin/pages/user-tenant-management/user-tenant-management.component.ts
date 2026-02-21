import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// ── Interfaces ──────────────────────────────────────────
export type UserStatus    = 'active' | 'suspended' | 'pending' | 'deleted';
export type UserRole      = 'OWNER' | 'MANAGER' | 'CASHIER' | 'CHEF' | 'WAITER' | 'BILLING_ASSISTANT';
export type PlanType      = 'Basic' | 'Basic+' | 'Premium' | 'Ultra';
export type ActivityLevel = 'normal' | 'suspicious' | 'blocked';

export interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  restaurantName: string;
  plan: PlanType;
  status: UserStatus;
  role: UserRole;
  joinDate: string;
  lastActive: string;
  activityLevel: ActivityLevel;
  suspiciousFlags: number;
  usageStats: UsageStats;
  activityHistory: ActivityLog[];
  subscription: SubscriptionInfo;
}

export interface UsageStats {
  ordersThisMonth: number;
  totalRevenue: string;
  apiCallsToday: number;
  storageUsedMB: number;
  storageMaxMB: number;
  activeStaff: number;
  maxStaff: number;
  loginCount30d: number;
}

export interface ActivityLog {
  id: number;
  timestamp: string;
  action: string;
  ip: string;
  device: string;
  status: 'success' | 'failed' | 'blocked';
}

export interface SubscriptionInfo {
  plan: PlanType;
  billingCycle: 'Monthly' | 'Yearly';
  startDate: string;
  nextRenewal: string;
  amount: string;
  status: 'active' | 'expired' | 'trial';
}

// ── Component ──────────────────────────────────────────
@Component({
  selector: 'app-user-tenant-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-tenant-management.component.html',
  styleUrls: ['./user-tenant-management.component.css']
})
export class UserTenantManagementComponent implements OnInit, OnDestroy {

  // ── State ─────────────────────────────────────────
  searchQuery        = '';
  activeStatusFilter: string = 'ALL';
  activePlanFilter:   string = 'ALL';
  activeTab:          string = 'users';
  showDetailsPanel   = false;
  showRoleModal      = false;
  showResetModal     = false;
  showImpersonateModal = false;
  showSuspendModal   = false;
  selectedTenant: Tenant | null = null;
  newRole: UserRole  = 'MANAGER';
  impersonateReason  = '';
  suspendReason      = '';
  today              = '';
  private searchTimer: any;

  // ── Nav ────────────────────────────────────────────
  navItems = [
    { label: 'Dashboard',       route: '/admin',                    active: false  },
    { label: 'User',            route: '/admin/users',              active: true },
    { label: 'Subscription',    route: '/admin/subscriptions',      active: false },
    { label: 'Security',        route: '/admin/security',           active: false },
    { label: 'Notifications',   route: '/admin/notifications',      active: false },
    { label: 'RBAC',            route: '/admin/rbac',               active: false },
    { label: 'Products',        route: '/admin/products',           active: false },
    { label: 'Configuration',   route: '/admin/configuration',      active: false },
    { label: 'AI Control',      route: '/admin/ai-control',         active: false },
    // { label: 'System Monitoring', route: '/admin/system-monitoring', active: false },
  ];
  // ── Summary Stats ─────────────────────────────────
  summaryStats = [
    { label: 'Total Tenants',    value: '1,284',  sub: '+24 this month', iconKey: 'tenants',  iconBg: '#EFF6FF', iconColor: '#2563EB' },
    { label: 'Active Users',     value: '1,147',  sub: '89.3% active',   iconKey: 'active',   iconBg: '#F0FDF4', iconColor: '#16A34A' },
    { label: 'Suspended',        value: '37',     sub: '2.9% of total',  iconKey: 'suspended',iconBg: '#FFF7ED', iconColor: '#EA580C' },
    { label: 'Suspicious Flags', value: '12',     sub: '↑ 3 today',      iconKey: 'flags',    iconBg: '#FFF1F2', iconColor: '#E11D48' },
    { label: 'Premium Plans',    value: '342',    sub: '26.6% of total', iconKey: 'premium',  iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { label: 'Trial Accounts',   value: '89',     sub: 'Expires < 7d',   iconKey: 'trial',    iconBg: '#ECFDF5', iconColor: '#059669' },
  ];

  // ── Filters ───────────────────────────────────────
  statusFilters = ['ALL', 'active', 'suspended', 'pending', 'deleted'];
  planFilters   = ['ALL', 'Basic', 'Basic+', 'Premium', 'Ultra'];
  roleOptions: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER', 'CHEF', 'WAITER', 'BILLING_ASSISTANT'];

  // ── Tenant Data ───────────────────────────────────
  allTenants: Tenant[] = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@spicebloom.in',
      phone: '+91 98765 43210',
      restaurantName: 'Spice Bloom Restaurant',
      plan: 'Premium',
      status: 'active',
      role: 'OWNER',
      joinDate: '2025-04-12',
      lastActive: '2026-02-20 10:42 IST',
      activityLevel: 'normal',
      suspiciousFlags: 0,
      usageStats: {
        ordersThisMonth: 1842,
        totalRevenue: '₹4,28,000',
        apiCallsToday: 3421,
        storageUsedMB: 1240,
        storageMaxMB: 5120,
        activeStaff: 18,
        maxStaff: 50,
        loginCount30d: 62
      },
      activityHistory: [
        { id: 1, timestamp: '2026-02-20 10:42', action: 'Login',         ip: '103.21.58.11', device: 'Chrome / Windows', status: 'success' },
        { id: 2, timestamp: '2026-02-20 09:15', action: 'Order Created', ip: '103.21.58.11', device: 'Chrome / Windows', status: 'success' },
        { id: 3, timestamp: '2026-02-19 18:33', action: 'Staff Added',   ip: '103.21.58.11', device: 'Mobile / Android', status: 'success' },
      ],
      subscription: { plan: 'Premium', billingCycle: 'Yearly', startDate: '2025-04-12', nextRenewal: '2026-04-12', amount: '₹18,000/yr', status: 'active' }
    },
    {
      id: 2,
      name: 'Priya Sharma',
      email: 'priya@thetandoori.com',
      phone: '+91 87654 32109',
      restaurantName: 'The Tandoori House',
      plan: 'Ultra',
      status: 'active',
      role: 'OWNER',
      joinDate: '2024-11-03',
      lastActive: '2026-02-20 08:55 IST',
      activityLevel: 'normal',
      suspiciousFlags: 0,
      usageStats: {
        ordersThisMonth: 3210,
        totalRevenue: '₹8,92,000',
        apiCallsToday: 6811,
        storageUsedMB: 3840,
        storageMaxMB: 10240,
        activeStaff: 47,
        maxStaff: 100,
        loginCount30d: 89
      },
      activityHistory: [
        { id: 1, timestamp: '2026-02-20 08:55', action: 'Login',           ip: '49.36.102.4',  device: 'Safari / MacOS',  status: 'success' },
        { id: 2, timestamp: '2026-02-19 22:10', action: 'Report Exported', ip: '49.36.102.4',  device: 'Safari / MacOS',  status: 'success' },
      ],
      subscription: { plan: 'Ultra', billingCycle: 'Yearly', startDate: '2024-11-03', nextRenewal: '2025-11-03', amount: '₹36,000/yr', status: 'active' }
    },
    {
      id: 3,
      name: 'Mohammed Iqbal',
      email: 'miqbal@zaiqa.in',
      phone: '+91 76543 21098',
      restaurantName: 'Zaiqa Biryani',
      plan: 'Basic+',
      status: 'suspended',
      role: 'OWNER',
      joinDate: '2025-07-22',
      lastActive: '2026-02-14 14:20 IST',
      activityLevel: 'suspicious',
      suspiciousFlags: 4,
      usageStats: {
        ordersThisMonth: 112,
        totalRevenue: '₹28,400',
        apiCallsToday: 0,
        storageUsedMB: 320,
        storageMaxMB: 2048,
        activeStaff: 5,
        maxStaff: 15,
        loginCount30d: 3
      },
      activityHistory: [
        { id: 1, timestamp: '2026-02-14 14:20', action: 'Login',             ip: '192.168.1.254', device: 'Unknown',       status: 'blocked'  },
        { id: 2, timestamp: '2026-02-14 13:55', action: 'Failed Login x5',   ip: '192.168.1.254', device: 'Unknown',       status: 'failed'   },
        { id: 3, timestamp: '2026-02-13 11:10', action: 'Mass Data Export',  ip: '45.89.192.12',  device: 'Chrome / Linux', status: 'failed'  },
      ],
      subscription: { plan: 'Basic+', billingCycle: 'Monthly', startDate: '2025-07-22', nextRenewal: '2026-03-22', amount: '₹999/mo', status: 'active' }
    },
    {
      id: 4,
      name: 'Sunita Reddy',
      email: 'sunita@cafebliss.in',
      phone: '+91 65432 10987',
      restaurantName: 'Cafe Bliss',
      plan: 'Basic',
      status: 'pending',
      role: 'OWNER',
      joinDate: '2026-02-18',
      lastActive: '2026-02-18 16:45 IST',
      activityLevel: 'normal',
      suspiciousFlags: 0,
      usageStats: {
        ordersThisMonth: 0,
        totalRevenue: '₹0',
        apiCallsToday: 12,
        storageUsedMB: 10,
        storageMaxMB: 1024,
        activeStaff: 0,
        maxStaff: 5,
        loginCount30d: 2
      },
      activityHistory: [
        { id: 1, timestamp: '2026-02-18 16:45', action: 'Registration',   ip: '122.167.4.88', device: 'Chrome / Windows', status: 'success' },
      ],
      subscription: { plan: 'Basic', billingCycle: 'Monthly', startDate: '2026-02-18', nextRenewal: '2026-03-18', amount: '₹299/mo', status: 'trial' }
    },
    {
      id: 5,
      name: 'Arjun Nair',
      email: 'arjun@saltpepper.in',
      phone: '+91 54321 09876',
      restaurantName: 'Salt & Pepper',
      plan: 'Premium',
      status: 'active',
      role: 'OWNER',
      joinDate: '2025-01-15',
      lastActive: '2026-02-20 11:10 IST',
      activityLevel: 'suspicious',
      suspiciousFlags: 2,
      usageStats: {
        ordersThisMonth: 2140,
        totalRevenue: '₹5,64,000',
        apiCallsToday: 8920,
        storageUsedMB: 2100,
        storageMaxMB: 5120,
        activeStaff: 29,
        maxStaff: 50,
        loginCount30d: 110
      },
      activityHistory: [
        { id: 1, timestamp: '2026-02-20 11:10', action: 'Login',            ip: '117.55.2.44',  device: 'Chrome / Windows', status: 'success' },
        { id: 2, timestamp: '2026-02-20 11:09', action: 'API Spike Detected', ip: '117.55.2.44', device: 'Automated Bot?', status: 'failed'  },
        { id: 3, timestamp: '2026-02-19 23:55', action: 'After-hours Access', ip: '117.55.2.44', device: 'Chrome / Windows', status: 'success' },
      ],
      subscription: { plan: 'Premium', billingCycle: 'Monthly', startDate: '2025-01-15', nextRenewal: '2026-03-15', amount: '₹1,499/mo', status: 'active' }
    },
    {
      id: 6,
      name: 'Divya Menon',
      email: 'divya@greenbowl.in',
      phone: '+91 43210 98765',
      restaurantName: 'Green Bowl Kitchen',
      plan: 'Basic',
      status: 'active',
      role: 'MANAGER',
      joinDate: '2025-09-08',
      lastActive: '2026-02-19 20:14 IST',
      activityLevel: 'normal',
      suspiciousFlags: 0,
      usageStats: {
        ordersThisMonth: 560,
        totalRevenue: '₹98,000',
        apiCallsToday: 840,
        storageUsedMB: 180,
        storageMaxMB: 1024,
        activeStaff: 4,
        maxStaff: 5,
        loginCount30d: 38
      },
      activityHistory: [
        { id: 1, timestamp: '2026-02-19 20:14', action: 'Login',            ip: '59.88.14.7',   device: 'Firefox / Windows', status: 'success' },
        { id: 2, timestamp: '2026-02-19 12:30', action: 'Menu Updated',     ip: '59.88.14.7',   device: 'Firefox / Windows', status: 'success' },
      ],
      subscription: { plan: 'Basic', billingCycle: 'Monthly', startDate: '2025-09-08', nextRenewal: '2026-03-08', amount: '₹299/mo', status: 'active' }
    },
  ];

  // ── Computed ──────────────────────────────────────
  get filteredTenants(): Tenant[] {
    return this.allTenants.filter(t => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q || t.name.toLowerCase().includes(q)
        || t.email.toLowerCase().includes(q)
        || t.restaurantName.toLowerCase().includes(q);
      const matchStatus = this.activeStatusFilter === 'ALL' || t.status === this.activeStatusFilter;
      const matchPlan   = this.activePlanFilter   === 'ALL' || t.plan   === this.activePlanFilter;
      return matchSearch && matchStatus && matchPlan;
    });
  }

  get suspiciousTenants(): Tenant[] {
    return this.allTenants.filter(t => t.activityLevel !== 'normal' || t.suspiciousFlags > 0);
  }

  get multiTenantIsolation() {
    return [
      { label: 'Data Isolation',     status: 'pass',    detail: 'All tenants use separate DB schemas' },
      { label: 'API Rate Limiting',  status: 'pass',    detail: 'Per-tenant 10K req/hr enforced'      },
      { label: 'Session Isolation',  status: 'pass',    detail: 'JWT scoped to tenant ID'             },
      { label: 'Storage Boundaries', status: 'warning', detail: '2 tenants at >80% capacity'          },
      { label: 'Log Segregation',    status: 'pass',    detail: 'Logs partitioned by tenant_id'        },
      { label: 'Cross-tenant Leak',  status: 'pass',    detail: 'No cross-tenant queries detected'    },
    ];
  }

  // ── Lifecycle ─────────────────────────────────────
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  // ── Actions ───────────────────────────────────────
  openDetails(tenant: Tenant): void {
    this.selectedTenant  = { ...tenant };
    this.showDetailsPanel = true;
    this.activeTab       = 'overview';
  }

  closeDetails(): void {
    this.showDetailsPanel = false;
    this.selectedTenant   = null;
  }

  openRoleModal(tenant: Tenant): void {
    this.selectedTenant = { ...tenant };
    this.newRole        = tenant.role;
    this.showRoleModal  = true;
  }

  confirmRoleChange(): void {
    if (!this.selectedTenant) return;
    const t = this.allTenants.find(x => x.id === this.selectedTenant!.id);
    if (t) t.role = this.newRole;
    this.showRoleModal = false;
  }

  openSuspendModal(tenant: Tenant): void {
    this.selectedTenant  = { ...tenant };
    this.suspendReason   = '';
    this.showSuspendModal = true;
  }

  confirmSuspend(): void {
    if (!this.selectedTenant) return;
    const t = this.allTenants.find(x => x.id === this.selectedTenant!.id);
    if (t) t.status = t.status === 'suspended' ? 'active' : 'suspended';
    this.showSuspendModal = false;
  }

  deleteUser(tenant: Tenant): void {
    if (!confirm(`Permanently delete ${tenant.name}? This cannot be undone.`)) return;
    const idx = this.allTenants.findIndex(x => x.id === tenant.id);
    if (idx !== -1) this.allTenants[idx].status = 'deleted';
  }

  forceLogout(tenant: Tenant): void {
    console.log(`Force logout triggered for tenant ${tenant.id} — ${tenant.name}`);
    // Wire to backend: POST /api/admin/tenants/:id/force-logout
    alert(`Session forcefully terminated for ${tenant.name}`);
  }

  openResetModal(tenant: Tenant): void {
    this.selectedTenant  = { ...tenant };
    this.showResetModal  = true;
  }

  confirmPasswordReset(): void {
    if (!this.selectedTenant) return;
    console.log(`Password reset link sent to ${this.selectedTenant.email}`);
    // Wire to backend: POST /api/admin/tenants/:id/reset-password
    this.showResetModal = false;
  }

  openImpersonateModal(tenant: Tenant): void {
    this.selectedTenant     = { ...tenant };
    this.impersonateReason  = '';
    this.showImpersonateModal = true;
  }

  confirmImpersonate(): void {
    if (!this.selectedTenant || !this.impersonateReason.trim()) return;
    console.log(`Impersonating tenant ${this.selectedTenant.id} — Reason: ${this.impersonateReason}`);
    // Wire to backend: POST /api/admin/impersonate { tenantId, reason }
    this.showImpersonateModal = false;
  }

  setDetailTab(tab: string): void {
    this.activeTab = tab;
  }

  setStatusFilter(f: string): void  { this.activeStatusFilter = f; }
  setPlanFilter(f: string): void    { this.activePlanFilter   = f; }

  // ── Helpers ──────────────────────────────────────
  getStatusClass(status: string): string {
    const m: Record<string, string> = {
      active: 'status-success', suspended: 'status-warning',
      pending: 'status-info',   deleted: 'status-error'
    };
    return m[status] || '';
  }

  getPlanClass(plan: string): string {
    const m: Record<string, string> = {
      'Basic': 'plan-basic', 'Basic+': 'plan-basic-plus',
      'Premium': 'plan-premium', 'Ultra': 'plan-ultra'
    };
    return m[plan] || '';
  }

  getActivityClass(level: string): string {
    const m: Record<string, string> = {
      normal: 'dot-success', suspicious: 'dot-warning', blocked: 'dot-error'
    };
    return m[level] || '';
  }

  getLogClass(status: string): string {
    const m: Record<string, string> = {
      success: 'log-info', failed: 'log-warn', blocked: 'log-error'
    };
    return m[status] || '';
  }

  getIsolationClass(status: string): string {
    const m: Record<string, string> = {
      pass: 'isol-pass', warning: 'isol-warning', fail: 'isol-fail'
    };
    return m[status] || '';
  }

  storagePercent(stats: UsageStats): number {
    return Math.round((stats.storageUsedMB / stats.storageMaxMB) * 100);
  }

  staffPercent(stats: UsageStats): number {
    return Math.round((stats.activeStaff / stats.maxStaff) * 100);
  }

  closeModals(): void {
    this.showRoleModal       = false;
    this.showResetModal      = false;
    this.showImpersonateModal = false;
    this.showSuspendModal    = false;
  }
}
