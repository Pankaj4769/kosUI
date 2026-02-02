import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { catchError, of } from 'rxjs';

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
  permissions: PermissionItem[];
}

@Component({
  selector: 'app-role-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css']
})
export class RoleManagementComponent implements OnInit {
  roles: Role[] = [];
  isModalOpen = false;
  editingRoleId: number | null = null;
  roleName = '';
  roleDescription = '';
  selectedPermissions: Set<string> = new Set();

  private API_BASE_URL = '/api'; // Change this to your API endpoint

  permissionCategories: PermissionCategory[] = [
    {
      title: 'Menu Management',
      permissions: [
        { id: 'menu.view', label: 'View Menu' },
        { id: 'menu.create', label: 'Create Menu Items' },
        { id: 'menu.edit', label: 'Edit Menu Items' },
        { id: 'menu.delete', label: 'Delete Menu Items' }
      ]
    },
    {
      title: 'Order Management',
      permissions: [
        { id: 'order.view', label: 'View Orders' },
        { id: 'order.create', label: 'Create Orders' },
        { id: 'order.update', label: 'Update Order Status' },
        { id: 'order.cancel', label: 'Cancel Orders' }
      ]
    },
    {
      title: 'Staff Management',
      permissions: [
        { id: 'staff.view', label: 'View Staff' },
        { id: 'staff.create', label: 'Add Staff Members' },
        { id: 'staff.edit', label: 'Edit Staff' },
        { id: 'staff.delete', label: 'Remove Staff' }
      ]
    },
    {
      title: 'Reports & Analytics',
      permissions: [
        { id: 'report.view', label: 'View Reports' },
        { id: 'report.export', label: 'Export Reports' },
        { id: 'analytics.view', label: 'View Analytics' }
      ]
    },
    {
      title: 'System Settings',
      permissions: [
        { id: 'settings.view', label: 'View Settings' },
        { id: 'settings.edit', label: 'Modify Settings' }
      ]
    }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.http.get<Role[]>(`${this.API_BASE_URL}/roles`)
      .pipe(
        catchError(error => {
          console.error('Failed to load roles, loading sample data:', error);
          return of(this.getSampleRoles());
        })
      )
      .subscribe(roles => {
        this.roles = roles;
      });
  }

  getSampleRoles(): Role[] {
    return [
      {
        id: 1,
        name: 'Restaurant Manager',
        description: 'Full access to all restaurant operations and management',
        permissions: [
          'menu.view', 'menu.create', 'menu.edit', 'menu.delete',
          'order.view', 'order.create', 'order.update', 'order.cancel',
          'staff.view', 'staff.create', 'staff.edit', 'staff.delete',
          'report.view', 'report.export', 'analytics.view',
          'settings.view', 'settings.edit'
        ]
      },
      {
        id: 2,
        name: 'Chef',
        description: 'Manages kitchen operations and menu items',
        permissions: ['menu.view', 'menu.create', 'menu.edit', 'order.view', 'order.update']
      },
      {
        id: 3,
        name: 'Waiter',
        description: 'Takes orders and serves customers',
        permissions: ['menu.view', 'order.view', 'order.create', 'order.update']
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
        role.permissions.forEach(perm => this.selectedPermissions.add(perm));
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
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
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
      catchError(error => {
        console.error('Error saving role:', error);
        this.showNotification('Failed to save role. Using local fallback.', 'error');
        return of(this.createLocalRole(roleData));
      })
    ).subscribe(savedRole => {
      if (this.editingRoleId) {
        const index = this.roles.findIndex(r => r.id === this.editingRoleId);
        if (index !== -1) {
          this.roles[index] = savedRole;
        }
      } else {
        this.roles.push(savedRole);
      }
      this.closeModal();
      this.showNotification('Role saved successfully!', 'success');
    });
  }

  createLocalRole(roleData: Partial<Role>): Role {
    const newId = this.roles.length > 0 
      ? Math.max(...this.roles.map(r => r.id)) + 1 
      : 1;
    
    return {
      id: this.editingRoleId || newId,
      name: roleData.name || '',
      description: roleData.description || '',
      permissions: roleData.permissions || []
    };
  }

  deleteRole(roleId: number): void {
    if (confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      this.http.delete(`${this.API_BASE_URL}/roles/${roleId}`)
        .pipe(
          catchError(error => {
            console.error('Error deleting role:', error);
            this.showNotification('Failed to delete role. Using local fallback.', 'error');
            return of(null);
          })
        )
        .subscribe(() => {
          this.roles = this.roles.filter(r => r.id !== roleId);
          this.showNotification('Role deleted successfully!', 'success');
        });
    }
  }

  togglePermission(permissionId: string): void {
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions.has(permissionId);
  }

  getModalTitle(): string {
    return this.editingRoleId ? 'Edit Role' : 'Create New Role';
  }

  formatPermission(perm: string): string {
    return perm.split('.').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getVisiblePermissions(permissions: string[]): string[] {
    return permissions.slice(0, 4);
  }

  getRemainingCount(permissions: string[]): number {
    return Math.max(0, permissions.length - 4);
  }

  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? 'var(--color-primary)' : 'var(--color-error)'};
      color: white;
      border-radius: var(--radius-base);
      box-shadow: var(--shadow-md);
      z-index: 10001;
      animation: slideIn 0.3s ease-out;
      font-family: var(--font-family-base);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}
