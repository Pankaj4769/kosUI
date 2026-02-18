import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth.model';

@Injectable({ providedIn: 'root' })
export class RoleService {

  constructor(private auth: AuthService) {}

  get currentRole(): UserRole | null {
    return this.auth.currentUser?.role ?? null;
  }

  hasRole(roles: UserRole[]): boolean {
    const role = this.currentRole;
    return !!role && roles.includes(role);
  }

  // ── Convenience helpers ──────────────────────────────────
  isAdmin(): boolean    { return this.hasRole(['ADMIN']); }
  isOwner(): boolean    { return this.hasRole(['OWNER']); }
  isManager(): boolean  { return this.hasRole(['ADMIN', 'OWNER', 'MANAGER']); }
  isCashier(): boolean  { return this.hasRole(['CASHIER']); }
  isBilling(): boolean  { return this.hasRole(['BILLING_ASSISTANT']); }
  isChef(): boolean     { return this.hasRole(['CHEF']); }
  isWaiter(): boolean   { return this.hasRole(['WAITER']); }

  // ── Access tier groups ───────────────────────────────────
  hasSuperAccess(): boolean {
    return this.hasRole(['ADMIN', 'OWNER']);
  }

  hasManagementAccess(): boolean {
    return this.hasRole(['ADMIN', 'OWNER', 'MANAGER']);
  }

  hasFloorAccess(): boolean {
    return this.hasRole(['WAITER', 'CASHIER', 'BILLING_ASSISTANT']);
  }

  hasKitchenAccess(): boolean {
    return this.hasRole(['CHEF']);
  }
}
