import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser, LoginRequest, OnboardingStatus, SubscriptionPlan, UserRole } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly STORAGE_KEY = 'kos_user';

  private mockUsers: AuthUser[] = [
    {
      staffId: 'S001', name: 'Admin User', username: 'admin',
      role: 'ADMIN', token: 'tok_admin',
      isFirstTime: false, onboardingStatus: 'SETUP_COMPLETE'
    },
    {
      staffId: 'S002', name: 'New Owner', username: 'newowner',
      email: 'owner&#64;gmail.com', mobile: '9999999999',
      role: 'OWNER', token: 'tok_owner',
      isFirstTime: true, onboardingStatus: 'NEW'
    },
  ];

  constructor(private router: Router) {}

  // ── Password Login ───────────────────────────────────────
  login(req: LoginRequest): { success: boolean; message: string } {
    let user: AuthUser | undefined;

    if (req.method === 'PASSWORD') {
      user = this.mockUsers.find(
        u => u.username === req.username && req.password === 'kos&#64;123'
      );
    } else if (req.method === 'MOBILE_OTP') {
      user = this.mockUsers.find(u => u.mobile === req.mobile);
      // In real app: verify OTP via API
    } else if (req.method === 'GOOGLE' || req.method === 'ZOHO') {
      // In real app: OAuth token verification
      // Simulate first-time social login → create new OWNER
      user = this.createSocialUser(req.method);
    }

    if (!user) return { success: false, message: 'Invalid credentials. Please try again.' };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.handlePostLogin(user);
    return { success: true, message: '' };
  }

  // ── OTP Send (mock) ──────────────────────────────────────
  sendOtp(mobile: string): { success: boolean; message: string } {
    console.log(`OTP sent to ${mobile}: 123456 (mock)`);
    return { success: true, message: 'OTP sent successfully.' };
  }

  // ── Social Login: Create new OWNER ──────────────────────
  private createSocialUser(method: 'GOOGLE' | 'ZOHO'): AuthUser {
    return {
      staffId: 'S' + Date.now(),
      name: method === 'GOOGLE' ? 'Google User' : 'Zoho User',
      username: method.toLowerCase() + '_user',
      email: method.toLowerCase() + '_user&#64;example.com',
      role: 'OWNER',
      token: 'tok_' + Date.now(),
      isFirstTime: true,
      onboardingStatus: 'NEW'
    };
  }

  // ── Post Login Routing ───────────────────────────────────
  handlePostLogin(user: AuthUser): void {
    if (user.isFirstTime || user.onboardingStatus === 'NEW') {
      this.router.navigate(['/onboarding/subscription']);
      return;
    }
    if (user.onboardingStatus === 'SUBSCRIPTION_SELECTED' ||
        user.onboardingStatus === 'PENDING_APPROVAL') {
      this.router.navigate(['/onboarding/pending']);
      return;
    }
    if (user.onboardingStatus === 'APPROVED') {
      this.router.navigate(['/onboarding/setup']);
      return;
    }
    // SETUP_COMPLETE → normal role-based redirect
    this.redirectByRole(user.role);
  }

  // ── Update Onboarding Status ─────────────────────────────
  updateOnboardingStatus(status: OnboardingStatus, plan?: SubscriptionPlan): void {
    const user = this.currentUser;
    if (!user) return;
    user.onboardingStatus = status;
    if (plan) user.subscriptionPlan = plan;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  get currentUser(): AuthUser | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  get isLoggedIn(): boolean { return !!this.currentUser; }

  private redirectByRole(role: UserRole): void {
    const map: Record<UserRole, string> = {
      ADMIN: '/dashboard', OWNER: '/dashboard', MANAGER: '/dashboard',
      CASHIER: '/pos', BILLING_ASSISTANT: '/pos',
      CHEF: '/orders/live', WAITER: '/pos/tables'
    };
    this.router.navigate([map[role] ?? '/dashboard']);
  }
}
