import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthUser } from '../../../core/auth/auth.model';
import { ConfirmDialogComponent } from '../../common-popup/pages/confirm-dialog.component';
import { UpgradePlanDialogComponent } from '../components/upgrade-plan-dialog/upgrade-plan-dialog.component';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyProfileComponent implements OnInit {

  user: AuthUser | null = null;

  editMode = false;
  showPasswordSection = false;

  // Editable fields
  editName     = '';
  editEmail    = '';
  editMobile   = '';
  editUsername = '';

  // Password fields
  currentPassword = '';
  newPassword     = '';
  confirmPassword = '';

  saveSuccess = false;
  saveSuccessMsg = 'Profile updated successfully.';

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.currentUser;
    this.resetEditFields();
  }

  get initials(): string {
    if (!this.user?.name) return '?';
    return this.user.name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get roleLabel(): string {
    const labels: Record<string, string> = {
      ADMIN: 'Administrator', OWNER: 'Owner', MANAGER: 'Manager',
      CASHIER: 'Cashier', BILLING_ASSISTANT: 'Billing Assistant',
      CHEF: 'Chef', WAITER: 'Waiter'
    };
    return labels[this.user?.role ?? ''] ?? this.user?.role ?? '';
  }

  get planLabel(): string {
    const labels: Record<string, string> = {
      STARTER: 'Starter', GROWTH: 'Growth', PRO: 'Pro', ENTERPRISE: 'Enterprise'
    };
    return labels[this.user?.subscriptionPlan ?? ''] ?? '—';
  }

  readonly planOrder = ['STARTER', 'GROWTH', 'PRO', 'ENTERPRISE'];

  readonly plans = [
    {
      key: 'STARTER', label: 'Starter', price: '₹999', per: '/mo',
      features: ['1 Restaurant', '5 Staff accounts', 'Basic POS', 'Sales reports']
    },
    {
      key: 'GROWTH', label: 'Growth', price: '₹2,499', per: '/mo',
      features: ['2 Restaurants', '15 Staff accounts', 'Advanced POS', 'Analytics dashboard', 'Email support']
    },
    {
      key: 'PRO', label: 'Pro', price: '₹4,999', per: '/mo',
      features: ['5 Restaurants', '50 Staff accounts', 'All POS features', 'Priority support', 'Custom reports']
    },
    {
      key: 'ENTERPRISE', label: 'Enterprise', price: 'Custom', per: '',
      features: ['Unlimited restaurants', 'Unlimited staff', 'Dedicated account manager', 'SLA guarantee', 'API access']
    }
  ];

  private get currentPlanIndex(): number {
    return this.planOrder.indexOf(this.user?.subscriptionPlan ?? '');
  }

  isPlanCurrent(key: string): boolean {
    return this.user?.subscriptionPlan === key;
  }

  isPlanLower(key: string): boolean {
    const idx = this.planOrder.indexOf(key);
    return idx !== -1 && idx < this.currentPlanIndex;
  }

  isPlanHigher(key: string): boolean {
    const idx = this.planOrder.indexOf(key);
    return idx !== -1 && idx > this.currentPlanIndex;
  }

  upgradePlan(plan: string): void {
    const planDef = this.plans.find(p => p.key === plan);
    if (!planDef) return;

    this.dialog.open(UpgradePlanDialogComponent, {
      width: '520px',
      disableClose: false,
      data: {
        planKey:      planDef.key,
        planLabel:    planDef.label,
        planPrice:    planDef.price,
        planFeatures: planDef.features
      }
    }).afterClosed().subscribe((upgraded: boolean) => {
      if (upgraded) {
        this.user = this.authService.currentUser;
        this.saveSuccess = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.saveSuccess = false; this.cdr.markForCheck(); }, 4000);
      }
    });
  }

  startEdit(): void {
    this.resetEditFields();
    this.editMode = true;
  }

  cancelEdit(): void {
    this.resetEditFields();
    this.editMode = false;
    this.showPasswordSection = false;
  }

  saveChanges(): void {
    if (!this.user) return;
    const updated: AuthUser = {
      ...this.user,
      name:     this.editName.trim()     || this.user.name,
      email:    this.editEmail.trim()    || this.user.email,
      mobile:   this.editMobile.trim()   || this.user.mobile,
      username: this.editUsername.trim() || this.user.username
    };
    localStorage.setItem('kos_user', JSON.stringify(updated));
    this.user = updated;
    this.editMode = false;
    this.showPasswordSection = false;
    this.saveSuccess = true;
    this.cdr.markForCheck();
    setTimeout(() => { this.saveSuccess = false; this.cdr.markForCheck(); }, 3000);
  }

  signOut(): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Sign Out',
        message: 'Are you sure you want to sign out?',
        confirmText: 'Sign Out',
        confirmColor: 'warn'
      }
    }).afterClosed().subscribe(result => {
      if (result) this.authService.logout();
    });
  }

  private resetEditFields(): void {
    this.editName     = this.user?.name     ?? '';
    this.editEmail    = this.user?.email    ?? '';
    this.editMobile   = this.user?.mobile   ?? '';
    this.editUsername = this.user?.username ?? '';
  }
}
