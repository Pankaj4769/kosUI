import { Component, OnDestroy, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginRequest } from '../../../core/auth/auth.model';


type LoginTab = 'password' | 'mobile';


// ── Role type ────────────────────────────────────────────
export type UserRole =
  | 'owner' | 'admin' | 'manager' | 'cashier' | 'billing' | 'chef' | 'waiter';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnDestroy {


  activeTab: LoginTab = 'password';


  // ── Password form ──────────────────────────────────────
  username     = '';
  password     = '';
  showPassword = false;

  // ── Role selector (password tab) ──────────────────────
  selectedRole: UserRole | '' = '';

  readonly roles: { value: UserRole; label: string; icon: string }[] = [
    { value: 'owner',   label: 'Owner',   icon: 'business_center' },
    { value: 'admin',   label: 'Admin',   icon: 'admin_panel_settings' },
    { value: 'manager', label: 'Manager', icon: 'manage_accounts' },
    { value: 'cashier', label: 'Cashier', icon: 'point_of_sale' },
    { value: 'billing', label: 'Billing', icon: 'receipt_long' },
    { value: 'chef',    label: 'Chef',    icon: 'restaurant' },
    { value: 'waiter',  label: 'Waiter',  icon: 'room_service' },
  ];


  // ── Mobile OTP form ────────────────────────────────────
  mobile   = '';
  otp      = '';
  otpSent  = false;
  otpTimer = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;


  // ── UI state ───────────────────────────────────────────
  errorMessage = '';
  isLoading    = false;


  // ── Dev roles (shown only in dev mode) ────────────────
  readonly devRoles: { label: string; username: string; icon: string }[] = [
    { label: 'Admin',   username: 'admin',   icon: 'admin_panel_settings' },
    { label: 'Owner',   username: 'owner',   icon: 'business_center' },
    { label: 'Manager', username: 'manager', icon: 'manage_accounts' },
    { label: 'Cashier', username: 'cashier', icon: 'point_of_sale' },
    { label: 'Billing', username: 'billing', icon: 'receipt_long' },
    { label: 'Chef',    username: 'chef',    icon: 'restaurant' },
    { label: 'Waiter',  username: 'waiter',  icon: 'room_service' },
  ];


  readonly showDevPanel = isDevMode();


  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn) this.auth.handlePostLogin(this.auth.currentUser!);
  }


  ngOnDestroy(): void { this.clearTimer(); }


  // ── Tab ────────────────────────────────────────────────
  setTab(tab: LoginTab): void {
    this.activeTab    = tab;
    this.errorMessage = '';
    if (tab === 'password') {
      this.otpSent = false;
      this.otp     = '';
      this.clearTimer();
    }
  }


  togglePassword(): void { this.showPassword = !this.showPassword; }


  // ── Password Submit ────────────────────────────────────
  onPasswordSubmit(): void {
    if (!this.username.trim()) {
      this.errorMessage = 'Please enter your username.'; return;
    }
    if (!this.password) {
      this.errorMessage = 'Please enter your password.'; return;
    }
    if (!this.selectedRole) {
      this.errorMessage = 'Please select your role.'; return;
    }
    this.doLogin({
      method:   'PASSWORD',
      username: this.username.trim(),
      password: this.password,
      role: this.selectedRole
    });
  }


  // ── Send OTP ───────────────────────────────────────────
  sendOtp(): void {
    const cleaned = this.mobile.replace(/\D/g, '');
    if (!cleaned || cleaned.length !== 10) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.'; return;
    }
    this.mobile       = cleaned;
    this.errorMessage = '';
    const res = this.auth.sendOtp(this.mobile);
    if (res.success) {
      this.otpSent = true;
      this.otp     = '';
      this.startTimer(30);
    } else {
      this.errorMessage = res.message || 'Failed to send OTP. Try again.';
    }
  }


  // ── OTP Submit ─────────────────────────────────────────
  onOtpSubmit(): void {
    if (!this.otp || this.otp.trim().length < 4) {
      this.errorMessage = 'Please enter the OTP sent to your mobile.'; return;
    }
    this.doLogin({ method: 'MOBILE_OTP', mobile: this.mobile, otp: this.otp.trim() });
  }


  // ── Social Login ───────────────────────────────────────
  loginWithGoogle(): void { this.doLogin({ method: 'GOOGLE' }); }
  loginWithZoho():   void { this.doLogin({ method: 'ZOHO' });   }


  // ── Core Login ─────────────────────────────────────────
  private doLogin(req: LoginRequest): void {
    this.isLoading    = true;
    this.errorMessage = '';
    setTimeout(() => {
      this.auth.login(req).subscribe(res=>{
        if (!res.success) this.errorMessage = res.message;
        this.isLoading = false;
      });
    }, 800);
  }


  // ── OTP Countdown ──────────────────────────────────────
  private startTimer(seconds: number): void {
    this.otpTimer = seconds;
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.otpTimer--;
      if (this.otpTimer <= 0) this.clearTimer();
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }


  // ── Dev Quick-fill ─────────────────────────────────────
  fillRole(username: string): void {
    if (!this.showDevPanel) return;
    this.activeTab    = 'password';
    this.username     = username;
    this.password     = 'kos123';
    this.selectedRole = username as UserRole; // also pre-selects the dropdown
    this.errorMessage = '';
  }
}
