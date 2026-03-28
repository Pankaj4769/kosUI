import { UserRole, SubscriptionPlan } from '../auth/auth.model';

// ── Plan hierarchy ───────────────────────────────────────────────────────────
export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  STARTER:    1,
  GROWTH:     2,
  PRO:        3,
  ENTERPRISE: 4,
};

// ── All addressable feature keys ─────────────────────────────────────────────
export type FeatureKey =
  // Inventory & Stock Management
  | 'inventory-dashboard'
  | 'stock-items'
  | 'low-stock-alerts'
  | 'stock-adjustment-logs'
  | 'supplier-management'
  | 'purchase-order-management'
  | 'waste-tracking'
  | 'raw-material-cost-tracking'
  | 'multi-location-inventory'
  // POS & Billing
  | 'menu-management'
  | 'category-modifier-setup'
  | 'cashier-panel'
  | 'split-billing'
  | 'discount-coupon'
  | 'tax-configuration'
  | 'multi-terminal-pos'
  | 'offline-billing'
  // Order Management
  | 'table-management'
  | 'live-order-tracking'
  | 'order-history'
  | 'kitchen-display-system'
  | 'online-order-integration'
  | 'delivery-partner-integration'
  | 'multi-branch-order-sync'
  // Employee & Role Management
  | 'staff-directory'
  | 'employee-management'
  | 'attendance-tracking'
  | 'leave-management'
  | 'payroll'
  | 'shift-scheduling'
  | 'role-based-access'
  | 'activity-logs'
  | 'multi-branch-staff-access'
  // Reports & Analytics
  | 'sales-reports'
  | 'expense-reports'
  | 'inventory-reports'
  | 'profit-loss-reports'
  | 'staff-performance-reports'
  | 'advanced-analytics'
  | 'custom-report-builder'
  // System & Automation
  | 'settings'
  | 'qr-codes'
  | 'sms-email-notifications'
  | 'automated-daily-reports'
  | 'api-access'
  | 'white-label-branding'
  | 'priority-support'
  // Add-ons & Growth Tools
  | 'online-payment-gateway'
  | 'loyalty-rewards'
  | 'restaurant-website-builder'
  | 'custom-domain'
  | 'marketing-campaigns'
  | 'multi-location-management';

// ── Role shorthand groups ─────────────────────────────────────────────────────
const ALL_ROLES: UserRole[]        = ['ADMIN','OWNER','MANAGER','CASHIER','BILLING_ASSISTANT','CHEF','WAITER'];
const MANAGEMENT: UserRole[]       = ['ADMIN','OWNER','MANAGER'];
const OWNER_UP: UserRole[]         = ['ADMIN','OWNER'];
const FLOOR_STAFF: UserRole[]      = ['CASHIER','BILLING_ASSISTANT','WAITER'];
const FLOOR_AND_MGT: UserRole[]    = ['ADMIN','OWNER','MANAGER','CASHIER','BILLING_ASSISTANT','WAITER'];
const KITCHEN_AND_MGT: UserRole[]  = ['ADMIN','OWNER','MANAGER','CHEF'];
const POS_ROLES: UserRole[]        = ['ADMIN','OWNER','MANAGER','CASHIER','BILLING_ASSISTANT'];

// ── Feature access matrix ────────────────────────────────────────────────────
// minPlan = minimum subscription required
// roles   = roles that can use this feature (plan AND role must both pass)

export interface FeatureAccess {
  minPlan: SubscriptionPlan;
  roles:   UserRole[];
  label:   string;              // human-readable — used in upgrade prompts
}

export const FEATURE_ACCESS: Record<FeatureKey, FeatureAccess> = {

  // ── Inventory & Stock Management ─────────────────────────────────────────
  'inventory-dashboard':        { minPlan: 'STARTER',    roles: MANAGEMENT,      label: 'Inventory Dashboard' },
  'stock-items':                { minPlan: 'STARTER',    roles: MANAGEMENT,      label: 'Add / Edit Stock Items' },
  'low-stock-alerts':           { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'Low Stock Alerts' },
  'stock-adjustment-logs':      { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'Stock Adjustment Logs' },
  'supplier-management':        { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Supplier Management' },
  'purchase-order-management':  { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Purchase Order Management' },
  'waste-tracking':             { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Waste Tracking' },
  'raw-material-cost-tracking': { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Raw Material Cost Tracking' },
  'multi-location-inventory':   { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Multi-Location Inventory' },

  // ── POS & Billing ────────────────────────────────────────────────────────
  'menu-management':            { minPlan: 'STARTER',    roles: MANAGEMENT,      label: 'Menu Management' },
  'category-modifier-setup':    { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'Category & Modifier Setup' },
  'cashier-panel':              { minPlan: 'STARTER',    roles: POS_ROLES,       label: 'Cashier Panel' },
  'split-billing':              { minPlan: 'GROWTH',     roles: POS_ROLES,       label: 'Split Billing' },
  'discount-coupon':            { minPlan: 'GROWTH',     roles: POS_ROLES,       label: 'Discount & Coupon Support' },
  'tax-configuration':          { minPlan: 'STARTER',    roles: MANAGEMENT,      label: 'Tax Configuration' },
  'multi-terminal-pos':         { minPlan: 'PRO',        roles: POS_ROLES,       label: 'Multi-Terminal POS' },
  'offline-billing':            { minPlan: 'ENTERPRISE', roles: POS_ROLES,       label: 'Offline Billing Mode' },

  // ── Order Management ─────────────────────────────────────────────────────
  'table-management':           { minPlan: 'GROWTH',     roles: FLOOR_AND_MGT,   label: 'Table Management' },
  'live-order-tracking':        { minPlan: 'GROWTH',     roles: ALL_ROLES,       label: 'Live Order Tracking' },
  'order-history':              { minPlan: 'GROWTH',     roles: FLOOR_AND_MGT,   label: 'Order History' },
  'kitchen-display-system':     { minPlan: 'PRO',        roles: KITCHEN_AND_MGT, label: 'Kitchen Display System (KDS)' },
  'online-order-integration':   { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Online Order Integration' },
  'delivery-partner-integration':{ minPlan: 'ENTERPRISE',roles: MANAGEMENT,      label: 'Delivery Partner Integration' },
  'multi-branch-order-sync':    { minPlan: 'ENTERPRISE', roles: MANAGEMENT,      label: 'Multi-Branch Order Sync' },

  // ── Employee & Role Management ───────────────────────────────────────────
  'staff-directory':            { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Staff Directory' },
  'employee-management':        { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Employee Management' },
  'attendance-tracking':        { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Attendance Tracking' },
  'leave-management':           { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Leave Management' },
  'payroll':                    { minPlan: 'PRO',        roles: OWNER_UP,        label: 'Salary & Payroll' },
  'shift-scheduling':           { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Shift Scheduling' },
  'role-based-access':          { minPlan: 'PRO',        roles: OWNER_UP,        label: 'Role-Based Access Control' },
  'activity-logs':              { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Activity Logs' },
  'multi-branch-staff-access':  { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Multi-Branch Staff Access' },

  // ── Reports & Analytics ──────────────────────────────────────────────────
  'sales-reports':              { minPlan: 'STARTER',    roles: MANAGEMENT,      label: 'Sales Reports' },
  'expense-reports':            { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'Expense Reports' },
  'inventory-reports':          { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'Inventory Reports' },
  'profit-loss-reports':        { minPlan: 'PRO',        roles: OWNER_UP,        label: 'Profit & Loss Reports' },
  'staff-performance-reports':  { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Staff Performance Reports' },
  'advanced-analytics':         { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Advanced Analytics Dashboard' },
  'custom-report-builder':      { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Custom Report Builder' },

  // ── System & Automation ──────────────────────────────────────────────────
  'settings':                   { minPlan: 'STARTER',    roles: OWNER_UP,        label: 'Settings & Configurations' },
  'qr-codes':                   { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'QR Code for Tables' },
  'sms-email-notifications':    { minPlan: 'GROWTH',     roles: MANAGEMENT,      label: 'SMS / Email Notifications' },
  'automated-daily-reports':    { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Automated Daily Reports' },
  'api-access':                 { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'API Access' },
  'white-label-branding':       { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'White-Label Branding' },
  'priority-support':           { minPlan: 'ENTERPRISE', roles: ALL_ROLES,       label: 'Priority Support' },

  // ── Add-ons & Growth Tools ───────────────────────────────────────────────
  'online-payment-gateway':     { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Online Payment Gateway' },
  'loyalty-rewards':            { minPlan: 'PRO',        roles: MANAGEMENT,      label: 'Loyalty & Rewards Program' },
  'restaurant-website-builder': { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Restaurant Website Builder' },
  'custom-domain':              { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Custom Domain Support' },
  'marketing-campaigns':        { minPlan: 'ENTERPRISE', roles: MANAGEMENT,      label: 'Marketing Campaign Tools' },
  'multi-location-management':  { minPlan: 'ENTERPRISE', roles: OWNER_UP,        label: 'Multi-Location Management' },
};

// ── Plan display metadata ────────────────────────────────────────────────────
export const PLAN_META: Record<SubscriptionPlan, { label: string; price: string; tagline: string }> = {
  STARTER:    { label: 'Starter',    price: '₹999/mo',    tagline: 'For Small Cafes' },
  GROWTH:     { label: 'Growth',     price: '₹1,999/mo',  tagline: 'For Growing Restaurants' },
  PRO:        { label: 'Pro',        price: '₹3,499/mo',  tagline: 'For High-Volume Kitchens' },
  ENTERPRISE: { label: 'Enterprise', price: '₹5,999/mo',  tagline: 'For Multi-Branch & Chains' },
};
