import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';

import { StaffService, StaffMember } from '../../../domains/staff/services/staff.service';
import { AuthService } from '../../../core/auth/auth.service';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

interface PermissionItem {
  id: string;
  label: string;
}

interface PermissionCategory {
  title: string;
  icon: string; // SVG path key
  permissions: PermissionItem[];
}

// All permissions that the owner has
const ALL_PERMISSIONS = [
  'menu.view','menu.create','menu.edit','menu.delete',
  'order.view','order.create','order.update','order.cancel',
  'staff.view','staff.create','staff.edit','staff.delete',
  'report.view','report.export','analytics.view',
  'settings.view','settings.edit'
];

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css']
})
export class RoleManagementComponent implements OnInit, OnDestroy {

  roles: Role[] = [];
  staffMembers: StaffMember[] = [];
  ownerName = 'Restaurant Owner';

  isModalOpen = false;
  editingRoleId: number | null = null;
  roleName = '';
  roleDescription = '';
  selectedPermissions: Set<string> = new Set();

  deletingRole: Role | null = null;
  toast: { message: string; type: 'success' | 'error' } | null = null;

  // All permissions list (used in owner card)
  readonly ALL_PERMISSIONS = ALL_PERMISSIONS;

  private API_BASE_URL = '/api';
  private toastTimer: any;
  private destroy$ = new Subject<void>();

  permissionCategories: PermissionCategory[] = [
    {
      title: 'Menu Management',
      icon: 'menu',
      permissions: [
        { id: 'menu.view',   label: 'View Menu' },
        { id: 'menu.create', label: 'Create Menu Items' },
        { id: 'menu.edit',   label: 'Edit Menu Items' },
        { id: 'menu.delete', label: 'Delete Menu Items' }
      ]
    },
    {
      title: 'Order Management',
      icon: 'order',
      permissions: [
        { id: 'order.view',   label: 'View Orders' },
        { id: 'order.create', label: 'Create Orders' },
        { id: 'order.update', label: 'Update Order Status' },
        { id: 'order.cancel', label: 'Cancel Orders' }
      ]
    },
    {
      title: 'Staff Management',
      icon: 'staff',
      permissions: [
        { id: 'staff.view',   label: 'View Staff' },
        { id: 'staff.create', label: 'Add Staff Members' },
        { id: 'staff.edit',   label: 'Edit Staff' },
        { id: 'staff.delete', label: 'Remove Staff' }
      ]
    },
    {
      title: 'Reports & Analytics',
      icon: 'report',
      permissions: [
        { id: 'report.view',    label: 'View Reports' },
        { id: 'report.export',  label: 'Export Reports' },
        { id: 'analytics.view', label: 'View Analytics' }
      ]
    },
    {
      title: 'System Settings',
      icon: 'settings',
      permissions: [
        { id: 'settings.view', label: 'View Settings' },
        { id: 'settings.edit', label: 'Modify Settings' }
      ]
    }
  ];

  constructor(
    private http: HttpClient,
    private staffSvc: StaffService,
    private authSvc: AuthService
  ) {}

  ngOnInit(): void {
    // Set owner name from current session
    const user = this.authSvc.currentUser;
    if (user?.name) this.ownerName = user.name;

    this.loadRoles();

    // Load staff so we can show members per role
    const restaurantId = user?.restaurantId ?? '';
    if (restaurantId) this.staffSvc.loadStaff(restaurantId);

    this.staffSvc.staff$.pipe(takeUntil(this.destroy$)).subscribe(members => {
      this.staffMembers = members;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.toastTimer);
  }

  // ─── Staff helpers ────────────────────────────────────────────────

  getStaffForRole(role: Role): StaffMember[] {
    return this.staffMembers.filter(m =>
      m.roleName?.toLowerCase() === role.name.toLowerCase() ||
      m.roleId === role.id
    );
  }

  getVisibleStaff(role: Role): StaffMember[] {
    return this.getStaffForRole(role).slice(0, 4);
  }

  getExtraStaffCount(role: Role): number {
    return Math.max(0, this.getStaffForRole(role).length - 4);
  }

  getAvatarColor(name: string): string {
    const palette = ['#16a34a','#2563eb','#0f766e','#d97706','#4f46e5','#dc2626','#7c3aed'];
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
    return palette[hash % palette.length];
  }

  // ─── Roles CRUD ───────────────────────────────────────────────────

  loadRoles(): void {
    this.http.get<Role[]>(`${this.API_BASE_URL}/roles`)
      .pipe(catchError(() => of(this.getSampleRoles())))
      .subscribe(roles => { this.roles = roles; });
  }

  getSampleRoles(): Role[] {
    return [
      {
        id: 1, name: 'Restaurant Manager',
        description: 'Full access to all restaurant operations and management',
        permissions: ALL_PERMISSIONS
      },
      {
        id: 2, name: 'Chef',
        description: 'Manages kitchen operations and menu items',
        permissions: ['menu.view','menu.create','menu.edit','order.view','order.update']
      },
      {
        id: 3, name: 'Waiter',
        description: 'Takes orders and serves customers',
        permissions: ['menu.view','order.view','order.create','order.update']
      }
    ];
  }

  openModal(roleId?: number): void {
    this.isModalOpen = true;
    this.selectedPermissions.clear();
    if (roleId) {
      this.editingRoleId = roleId;
      const role = this.roles.find(r => r.id === roleId);
      if (role) {
        this.roleName = role.name;
        this.roleDescription = role.description;
        role.permissions.forEach(p => this.selectedPermissions.add(p));
      }
    } else {
      this.editingRoleId = null;
      this.roleName = '';
      this.roleDescription = '';
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingRoleId = null;
    this.roleName = '';
    this.roleDescription = '';
    this.selectedPermissions.clear();
  }

  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  saveRole(): void {
    const roleData: Partial<Role> = {
      name: this.roleName.trim(),
      description: this.roleDescription.trim(),
      permissions: Array.from(this.selectedPermissions)
    };

    const request = this.editingRoleId
      ? this.http.put<Role>(`${this.API_BASE_URL}/roles/${this.editingRoleId}`, roleData)
      : this.http.post<Role>(`${this.API_BASE_URL}/roles`, roleData);

    request.pipe(
      catchError(() => {
        this.showNotification('Saved locally (API unavailable).', 'success');
        return of(this.createLocalRole(roleData));
      })
    ).subscribe(saved => {
      if (this.editingRoleId) {
        const i = this.roles.findIndex(r => r.id === this.editingRoleId);
        if (i !== -1) this.roles[i] = saved;
      } else {
        this.roles.push(saved);
      }
      this.closeModal();
      this.showNotification('Role saved successfully!', 'success');
    });
  }

  createLocalRole(data: Partial<Role>): Role {
    const newId = this.roles.length > 0 ? Math.max(...this.roles.map(r => r.id)) + 1 : 1;
    return { id: this.editingRoleId || newId, name: data.name || '', description: data.description || '', permissions: data.permissions || [] };
  }

  confirmDelete(role: Role): void { this.deletingRole = role; }

  executeDelete(): void {
    if (!this.deletingRole) return;
    const roleId = this.deletingRole.id;
    this.deletingRole = null;
    this.http.delete(`${this.API_BASE_URL}/roles/${roleId}`)
      .pipe(catchError(() => { this.showNotification('Failed to delete role.', 'error'); return of(null); }))
      .subscribe(() => {
        this.roles = this.roles.filter(r => r.id !== roleId);
        this.showNotification('Role deleted successfully!', 'success');
      });
  }

  // ─── Permission helpers ───────────────────────────────────────────

  togglePermission(id: string): void {
    this.selectedPermissions.has(id) ? this.selectedPermissions.delete(id) : this.selectedPermissions.add(id);
  }

  toggleCategory(category: PermissionCategory): void {
    const allSelected = category.permissions.every(p => this.selectedPermissions.has(p.id));
    category.permissions.forEach(p =>
      allSelected ? this.selectedPermissions.delete(p.id) : this.selectedPermissions.add(p.id)
    );
  }

  isCategoryFullySelected(category: PermissionCategory): boolean {
    return category.permissions.every(p => this.selectedPermissions.has(p.id));
  }

  isCategoryPartiallySelected(category: PermissionCategory): boolean {
    const count = category.permissions.filter(p => this.selectedPermissions.has(p.id)).length;
    return count > 0 && count < category.permissions.length;
  }

  isPermissionSelected(id: string): boolean { return this.selectedPermissions.has(id); }

  getModalTitle(): string { return this.editingRoleId ? 'Edit Role' : 'Create New Role'; }

  formatPermission(perm: string): string {
    return perm.split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  getVisiblePermissions(permissions: string[]): string[] { return permissions.slice(0, 3); }
  getRemainingCount(permissions: string[]): number { return Math.max(0, permissions.length - 3); }

  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 3000);
  }
}
