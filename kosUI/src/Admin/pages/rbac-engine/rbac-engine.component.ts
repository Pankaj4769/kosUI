import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface Permission {
  key: string;
  label: string;
  category: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: number;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  targetType: 'role' | 'permission' | 'user' | 'system';
  detail: string;
  timestamp: string;
  ip: string;
  severity: 'info' | 'warning' | 'critical';
}

@Component({
  selector: 'app-rbac-engine',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './rbac-engine.component.html',
  styleUrls: ['./rbac-engine.component.css']
})
export class RbacEngineComponent implements OnInit {

  activeTab = 'roles';
  today = '';

  tabs = [
    { key: 'roles',       label: 'Roles'              },
    { key: 'permissions', label: 'Permission Matrix'  },
    { key: 'access',      label: 'Granular Access'    },
    { key: 'audit',       label: 'Audit Log'          },
  ];

  /* ── Stats ── */
  stats = [
    { label: 'Total Roles',        value: '7',    sub: '3 system roles',     iconBg: '#EFF6FF', iconColor: '#2563EB' },
    { label: 'Total Permissions',  value: '48',   sub: 'Across 8 modules',   iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { label: 'Active Admins',      value: '12',   sub: '4 super admins',     iconBg: '#F0FDF4', iconColor: '#16A34A' },
    { label: 'Audit Events Today', value: '134',  sub: '3 critical',         iconBg: '#FFF1F2', iconColor: '#E11D48' },
  ];

  /* ── All Permissions ── */
  allPermissions: Permission[] = [
    // Dashboard
    { key: 'dashboard.view',     label: 'View Dashboard',        category: 'Dashboard',    description: 'Access the main admin dashboard' },
    { key: 'dashboard.export',   label: 'Export Reports',        category: 'Dashboard',    description: 'Download dashboard data as CSV/PDF' },
    // Tenants
    { key: 'tenants.view',       label: 'View Tenants',          category: 'Tenants',      description: 'View tenant list and profiles' },
    { key: 'tenants.create',     label: 'Create Tenant',         category: 'Tenants',      description: 'Onboard new tenants to the platform' },
    { key: 'tenants.edit',       label: 'Edit Tenant',           category: 'Tenants',      description: 'Modify tenant details and settings' },
    { key: 'tenants.delete',     label: 'Delete Tenant',         category: 'Tenants',      description: 'Permanently remove a tenant' },
    { key: 'tenants.suspend',    label: 'Suspend Tenant',        category: 'Tenants',      description: 'Temporarily disable tenant access' },
    // Billing
    { key: 'billing.view',       label: 'View Billing',          category: 'Billing',      description: 'See invoices and payment history' },
    { key: 'billing.manage',     label: 'Manage Billing',        category: 'Billing',      description: 'Edit plans and issue refunds' },
    { key: 'billing.refund',     label: 'Issue Refunds',         category: 'Billing',      description: 'Process refunds to tenants' },
    // Products
    { key: 'products.view',      label: 'View Products',         category: 'Products',     description: 'Browse product catalog' },
    { key: 'products.create',    label: 'Create Product',        category: 'Products',     description: 'Add new products to catalog' },
    { key: 'products.edit',      label: 'Edit Product',          category: 'Products',     description: 'Update product details and pricing' },
    { key: 'products.delete',    label: 'Delete Product',        category: 'Products',     description: 'Remove products permanently' },
    // Feature Flags
    { key: 'flags.view',         label: 'View Feature Flags',    category: 'Features',     description: 'See all feature flag states' },
    { key: 'flags.toggle',       label: 'Toggle Feature Flags',  category: 'Features',     description: 'Enable or disable feature flags globally' },
    { key: 'flags.rollout',      label: 'Manage Rollouts',       category: 'Features',     description: 'Configure gradual rollout percentages' },
    // Security
    { key: 'security.view',      label: 'View Security',         category: 'Security',     description: 'View security events and audit logs' },
    { key: 'security.manage',    label: 'Manage Security',       category: 'Security',     description: 'Configure security policies and 2FA' },
    { key: 'security.ip',        label: 'Manage IP Rules',       category: 'Security',     description: 'Add/remove IP whitelist and blacklist rules' },
    // Notifications
    { key: 'notif.view',         label: 'View Notifications',    category: 'Notifications',description: 'See notification history' },
    { key: 'notif.send',         label: 'Send Notifications',    category: 'Notifications',description: 'Broadcast messages to tenants' },
    { key: 'notif.maintenance',  label: 'Maintenance Alerts',    category: 'Notifications',description: 'Send emergency maintenance notifications' },
    // Config
    { key: 'config.view',        label: 'View Config',           category: 'Config',       description: 'View platform configuration' },
    { key: 'config.edit',        label: 'Edit Config',           category: 'Config',       description: 'Modify global platform settings' },
    // RBAC
    { key: 'rbac.view',          label: 'View Roles',            category: 'RBAC',         description: 'View roles and permissions' },
    { key: 'rbac.manage',        label: 'Manage Roles',          category: 'RBAC',         description: 'Create, edit, delete roles' },
    { key: 'rbac.assign',        label: 'Assign Roles',          category: 'RBAC',         description: 'Assign roles to users' },
  ];

  permissionCategories = ['Dashboard','Tenants','Billing','Products','Features','Security','Notifications','Config','RBAC'];

  /* ── Roles ── */
  roles: Role[] = [
    {
      id: 1, name: 'Super Admin', description: 'Full unrestricted access to all platform features',
      color: '#7C3AED', isSystem: true,
      permissions: ['dashboard.view','dashboard.export','tenants.view','tenants.create',
        'tenants.edit','tenants.delete','tenants.suspend','billing.view','billing.manage',
        'billing.refund','products.view','products.create','products.edit','products.delete',
        'flags.view','flags.toggle','flags.rollout','security.view','security.manage',
        'security.ip','notif.view','notif.send','notif.maintenance','config.view',
        'config.edit','rbac.view','rbac.manage','rbac.assign'],
      userCount: 4, createdAt: '2025-01-01', createdBy: 'System'
    },
    {
      id: 2, name: 'Admin', description: 'Full access except RBAC management and destructive actions',
      color: '#2563EB', isSystem: true,
      permissions: ['dashboard.view','dashboard.export','tenants.view','tenants.create',
        'tenants.edit','tenants.suspend','billing.view','billing.manage',
        'products.view','products.create','products.edit','flags.view','flags.toggle',
        'security.view','notif.view','notif.send','config.view','rbac.view'],
      userCount: 8, createdAt: '2025-01-01', createdBy: 'System'
    },
    {
      id: 3, name: 'Support Agent', description: 'View-only access to tenants, billing, and tickets',
      color: '#16A34A', isSystem: true,
      permissions: ['dashboard.view','tenants.view','billing.view','products.view',
        'flags.view','security.view','notif.view'],
      userCount: 14, createdAt: '2025-01-01', createdBy: 'System'
    },
    {
      id: 4, name: 'Billing Manager', description: 'Full control over billing, invoices, and refunds',
      color: '#D97706', isSystem: false,
      permissions: ['dashboard.view','tenants.view','billing.view','billing.manage','billing.refund'],
      userCount: 3, createdAt: '2025-03-15', createdBy: 'Ravi Kumar'
    },
    {
      id: 5, name: 'Product Manager', description: 'Manages products, feature flags and rollouts',
      color: '#EA580C', isSystem: false,
      permissions: ['dashboard.view','products.view','products.create','products.edit',
        'flags.view','flags.toggle','flags.rollout'],
      userCount: 5, createdAt: '2025-04-20', createdBy: 'Priya Mehta'
    },
    {
      id: 6, name: 'Security Analyst', description: 'Full security management and audit log access',
      color: '#DC2626', isSystem: false,
      permissions: ['dashboard.view','security.view','security.manage','security.ip',
        'rbac.view','notif.view'],
      userCount: 2, createdAt: '2025-06-10', createdBy: 'Ravi Kumar'
    },
    {
      id: 7, name: 'Read Only', description: 'View-only access — no write or destructive actions',
      color: '#64748B', isSystem: false,
      permissions: ['dashboard.view','tenants.view','billing.view','products.view',
        'flags.view','security.view','notif.view','config.view','rbac.view'],
      userCount: 6, createdAt: '2025-08-01', createdBy: 'System'
    },
  ];

  /* ── Role Modal ── */
  showRoleModal  = false;
  editingRole: Role | null = null;
  roleForm = {
    name: '', description: '', color: '#2563EB',
    permissions: [] as string[]
  };
  selectedRoleForDetail: Role | null = null;

  /* ── Audit Log ── */
  auditLogs: AuditLog[] = [
    {
      id: 1, actor: 'Ravi Kumar', actorRole: 'Super Admin',
      action: 'ROLE_PERMISSION_ADDED', target: 'Billing Manager',
      targetType: 'role', detail: 'Added permission billing.refund',
      timestamp: '2026-02-20 17:04', ip: '103.24.81.12', severity: 'warning'
    },
    {
      id: 2, actor: 'Priya Mehta', actorRole: 'Admin',
      action: 'ROLE_CREATED', target: 'Product Manager',
      targetType: 'role', detail: 'Created new role with 7 permissions',
      timestamp: '2026-02-20 14:30', ip: '192.168.1.50', severity: 'info'
    },
    {
      id: 3, actor: 'Ravi Kumar', actorRole: 'Super Admin',
      action: 'PERMISSION_REVOKED', target: 'Support Agent',
      targetType: 'permission', detail: 'Removed tenants.edit permission',
      timestamp: '2026-02-20 12:15', ip: '103.24.81.12', severity: 'warning'
    },
    {
      id: 4, actor: 'System', actorRole: 'Automated',
      action: 'ROLE_ASSIGNED', target: 'User #1042 - Vikram S.',
      targetType: 'user', detail: 'Auto-assigned Support Agent role on signup',
      timestamp: '2026-02-20 10:05', ip: '0.0.0.0', severity: 'info'
    },
    {
      id: 5, actor: 'Arjun Nair', actorRole: 'Super Admin',
      action: 'SUPER_ADMIN_PERMISSION_CHANGE', target: 'Super Admin Role',
      targetType: 'role', detail: 'Attempted to remove rbac.manage — blocked',
      timestamp: '2026-02-20 09:00', ip: '49.207.54.88', severity: 'critical'
    },
    {
      id: 6, actor: 'Priya Mehta', actorRole: 'Admin',
      action: 'ROLE_DELETED', target: 'Temp Viewer',
      targetType: 'role', detail: 'Deleted role — 0 users affected',
      timestamp: '2026-02-19 18:22', ip: '192.168.1.50', severity: 'warning'
    },
    {
      id: 7, actor: 'Ravi Kumar', actorRole: 'Super Admin',
      action: 'IP_WHITELIST_UPDATED', target: 'Security Config',
      targetType: 'system', detail: 'Added IP 103.24.81.0/24 to whitelist',
      timestamp: '2026-02-19 14:00', ip: '103.24.81.12', severity: 'info'
    },
    {
      id: 8, actor: 'System', actorRole: 'Automated',
      action: 'ROLE_PERMISSION_AUDIT', target: 'All Roles',
      targetType: 'system', detail: 'Scheduled permission sync completed — 48 permissions verified',
      timestamp: '2026-02-19 08:00', ip: '0.0.0.0', severity: 'info'
    },
  ];

  /* ── Audit Filters ── */
  auditFilter = 'all';
  auditFilterOptions = [
    { value: 'all',      label: 'All Events' },
    { value: 'info',     label: 'Info'       },
    { value: 'warning',  label: 'Warning'    },
    { value: 'critical', label: 'Critical'   },
  ];

  /* ── Granular Access ── */
  selectedRoleForAccess: Role | null = null;
  activePermCategory = 'All';

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    this.selectedRoleForAccess = this.roles[0];
    this.selectedRoleForDetail = this.roles[0];
  }

  /* ── Tab ── */
  setTab(k: string): void { this.activeTab = k; }

  /* ── Role Actions ── */
  openAddRole(): void {
    this.editingRole = null;
    this.roleForm = { name: '', description: '', color: '#2563EB', permissions: [] };
    this.showRoleModal = true;
  }

  openEditRole(r: Role): void {
    if (r.isSystem) return;
    this.editingRole = r;
    this.roleForm = {
      name: r.name, description: r.description,
      color: r.color, permissions: [...r.permissions]
    };
    this.showRoleModal = true;
  }

  saveRole(): void {
    if (!this.roleForm.name.trim()) return;
    if (this.editingRole) {
      Object.assign(this.editingRole, {
        name: this.roleForm.name,
        description: this.roleForm.description,
        color: this.roleForm.color,
        permissions: [...this.roleForm.permissions]
      });
    } else {
      this.roles.push({
        id: Date.now(),
        name: this.roleForm.name,
        description: this.roleForm.description,
        color: this.roleForm.color,
        isSystem: false,
        permissions: [...this.roleForm.permissions],
        userCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: 'Super Admin'
      });
    }
    this.showRoleModal = false;
  }

  deleteRole(r: Role): void {
    if (r.isSystem) return;
    this.roles = this.roles.filter(x => x.id !== r.id);
    if (this.selectedRoleForDetail?.id === r.id) {
      this.selectedRoleForDetail = this.roles[0] ?? null;
    }
    if (this.selectedRoleForAccess?.id === r.id) {
      this.selectedRoleForAccess = this.roles[0] ?? null;
    }
  }

  /* ── Permission Toggle (in modal) ── */
  toggleModalPerm(key: string): void {
    const i = this.roleForm.permissions.indexOf(key);
    if (i === -1) this.roleForm.permissions.push(key);
    else          this.roleForm.permissions.splice(i, 1);
  }

  isModalPermSelected(key: string): boolean {
    return this.roleForm.permissions.includes(key);
  }

  /* ── Granular Access ── */
  toggleAccessPerm(role: Role, key: string): void {
    if (role.isSystem) return;
    const i = role.permissions.indexOf(key);
    if (i === -1) role.permissions.push(key);
    else          role.permissions.splice(i, 1);
  }

  getRolePermForCategory(role: Role, cat: string): Permission[] {
    return this.getPermsByCategory(cat).filter(p => role.permissions.includes(p.key));
  }

  /* ── Helpers ── */
  getPermsByCategory(cat: string): Permission[] {
    return this.allPermissions.filter(p => p.category === cat);
  }

  get filteredAuditLogs(): AuditLog[] {
    if (this.auditFilter === 'all') return this.auditLogs;
    return this.auditLogs.filter(l => l.severity === this.auditFilter);
  }

  get allPermCategories(): string[] {
    return ['All', ...this.permissionCategories];
  }

  get filteredModalPerms(): Permission[] {
    if (this.activePermCategory === 'All') return this.allPermissions;
    return this.allPermissions.filter(p => p.category === this.activePermCategory);
  }

  getRolePermCount(r: Role): number {
    return r.permissions.length;
  }

  getTotalPermCount(): number {
    return this.allPermissions.length;
  }

  hasPermission(role: Role, key: string): boolean {
    return role.permissions.includes(key);
  }

  getAuditSeverityClass(s: string): string {
    const m: Record<string, string> = {
      info: 'as-info', warning: 'as-warning', critical: 'as-critical'
    };
    return m[s] ?? 'as-info';
  }

  getAuditTargetClass(t: string): string {
    const m: Record<string, string> = {
      role: 'at-role', permission: 'at-perm',
      user: 'at-user', system: 'at-system'
    };
    return m[t] ?? 'at-system';
  }

  get criticalAuditCount(): number {
    return this.auditLogs.filter(l => l.severity === 'critical').length;
  }

  selectRoleForAccess(r: Role): void {
    this.selectedRoleForAccess = r;
  }

  selectRoleForDetail(r: Role): void {
    this.selectedRoleForDetail = r;
  }
}
