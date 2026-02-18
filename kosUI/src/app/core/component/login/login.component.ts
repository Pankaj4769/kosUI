import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginRequest } from '../../../core/auth/auth.model';

type LoginTab = 'password' | 'mobile';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  activeTab: LoginTab = 'password';

  // Password form
  username = '';
  password = '';
  showPassword = false;

  // Mobile OTP form
  mobile = '';
  otp = '';
  otpSent = false;
  otpTimer = 0;
  timerInterval: any;

  errorMessage = '';
  isLoading = false;

  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn) this.auth.handlePostLogin(this.auth.currentUser!);
  }

  setTab(tab: LoginTab): void {
    this.activeTab = tab;
    this.errorMessage = '';
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }

  // ── Password Submit ──────────────────────────────────────
  onPasswordSubmit(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password.';
      return;
    }
    this.doLogin({ method: 'PASSWORD', username: this.username, password: this.password });
  }

  // ── Send OTP ─────────────────────────────────────────────
  sendOtp(): void {
    if (!this.mobile || this.mobile.length < 10) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }
    this.errorMessage = '';
    const res = this.auth.sendOtp(this.mobile);
    if (res.success) {
      this.otpSent = true;
      this.startTimer(30);
    }
  }

  // ── OTP Submit ───────────────────────────────────────────
  onOtpSubmit(): void {
    if (!this.otp || this.otp.length < 4) {
      this.errorMessage = 'Please enter the OTP.';
      return;
    }
    this.doLogin({ method: 'MOBILE_OTP', mobile: this.mobile, otp: this.otp });
  }

  // ── Social Login ─────────────────────────────────────────
  loginWithGoogle(): void { this.doLogin({ method: 'GOOGLE' }); }
  loginWithZoho(): void   { this.doLogin({ method: 'ZOHO' }); }

  // ── Core login ───────────────────────────────────────────
  private doLogin(req: LoginRequest): void {
    this.isLoading = true;
    this.errorMessage = '';
    setTimeout(() => {
      const res = this.auth.login(req);
      if (!res.success) this.errorMessage = res.message;
      this.isLoading = false;
    }, 800);
  }

  // ── OTP Countdown ────────────────────────────────────────
  private startTimer(seconds: number): void {
    this.otpTimer = seconds;
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.otpTimer--;
      if (this.otpTimer <= 0) clearInterval(this.timerInterval);
    }, 1000);
  }

  fillRole(username: string): void {
    this.activeTab = 'password';
    this.username = username;
    this.password = 'kos123';
  }
}
