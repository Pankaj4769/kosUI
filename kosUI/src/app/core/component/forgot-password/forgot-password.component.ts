import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { ForgotPasswordRequest, IdentifierType } from '../../auth/auth.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

  @Output() close = new EventEmitter<void>();

  step: number = 1;
  identifierType: IdentifierType = 'email';
  identifier = '';
  errorMsg   = '';
  isLoading  = false;

  // OTP fields (step 2)
  otp             = '';
  otpError        = '';
  otpLoading      = false;
  resendTimer     = 0;
  private resendInterval: ReturnType<typeof setInterval> | null = null;

  // New password fields (step 3)
  newPassword        = '';
  confirmNewPassword = '';
  showNewPassword    = false;
  showConfirmNew     = false;

  constructor(private auth: AuthService, private cdr: ChangeDetectorRef) {}

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('fp-overlay')) {
      this.close.emit();
    }
  }

  setType(type: IdentifierType): void {
    this.identifierType = type;
    this.identifier     = '';
    this.errorMsg       = '';
  }

  // Step 1: validate identifier, verify username exists, then send mock OTP
  submit(): void {
    const val = this.identifier.trim();
    if (!val) {
      this.errorMsg = 'Please enter ' + this.identifierLabel + '.';
      return;
    }

    if (this.identifierType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        this.errorMsg = 'Enter a valid email address.';
        return;
      }
    } else if (this.identifierType === 'mobile') {
      if (!/^\d{10}$/.test(val)) {
        this.errorMsg = 'Enter a valid 10-digit mobile number.';
        return;
      }
    } else {
      if (val.length < 3) {
        this.errorMsg = 'Username must be at least 3 characters.';
        return;
      }
    }

    this.errorMsg = '';

    if (this.identifierType === 'email' || this.identifierType === 'mobile') {
      this.isLoading = true;
      setTimeout(() => {
        this.isLoading = false;
        this.advanceToOtp();
      }, 1000);
    } else {
      // Username path: verify username exists first
      this.isLoading = true;
      this.auth.checkUsername(val).subscribe({
        next: () => {
          this.isLoading = false;
          this.advanceToOtp();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMsg = err.status === 404
            ? 'No account found with that username.'
            : 'Could not verify. Please check your connection.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  private advanceToOtp(): void {
    this.otp        = '';
    this.otpError   = '';
    this.step       = 2;
    this.startResendTimer();
    this.cdr.detectChanges();
  }

  resendOtp(): void {
    this.otp      = '';
    this.otpError = '';
    this.startResendTimer();
    this.cdr.detectChanges();
  }

  private startResendTimer(): void {
    this.resendTimer = 30;
    if (this.resendInterval) clearInterval(this.resendInterval);
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(this.resendInterval!);
        this.resendInterval = null;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  // Step 2: verify OTP (mock — accepts 123456)
  verifyOtp(): void {
    if (!this.otp.trim()) {
      this.otpError = 'Please enter the OTP.';
      return;
    }
    this.otpLoading = true;
    this.otpError   = '';

    setTimeout(() => {
      this.otpLoading = false;
      if (this.otp.trim() === '123456') {
        this.step = 3;
      } else {
        this.otpError = 'Invalid OTP. Please try again.';
      }
      this.cdr.detectChanges();
    }, 800);
  }

  // Step 3: set new password
  submitPassword(): void {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }

    this.errorMsg  = '';
    this.isLoading = true;

    const req: ForgotPasswordRequest = { identifier: this.identifier.trim(), identifierType: this.identifierType, newPassword: this.newPassword };
    this.auth.forgotPassword(req).subscribe({
      next: res => {
        this.isLoading = false;
        if (res.status) {
          this.step = 4;
        } else {
          this.errorMsg = res.message || 'Could not update password. Please try again.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Server error. Please try again later.';
        this.cdr.detectChanges();
      }
    });
  }

  get identifierLabel(): string {
    if (this.identifierType === 'email')  return 'your email address';
    if (this.identifierType === 'mobile') return 'your mobile number';
    return 'your username';
  }

  get identifierIcon(): string {
    if (this.identifierType === 'email')  return 'alternate_email';
    if (this.identifierType === 'mobile') return 'smartphone';
    return 'manage_accounts';
  }

  get identifierPlaceholder(): string {
    if (this.identifierType === 'email')  return 'Enter email address';
    if (this.identifierType === 'mobile') return 'Enter 10-digit mobile number';
    return 'Enter username';
  }

  get maskedContact(): string {
    const val = this.identifier.trim();
    if (this.identifierType === 'email') {
      const [local, domain] = val.split('@');
      return local.charAt(0) + '***' + local.charAt(local.length - 1) + '@' + domain;
    }
    if (this.identifierType === 'mobile') {
      return 'XXXXXX' + val.slice(-4);
    }
    // username — show generic hint
    return 'your registered mobile / email';
  }

  toggleNewPassword():  void { this.showNewPassword = !this.showNewPassword; }
  toggleConfirmNew():   void { this.showConfirmNew  = !this.showConfirmNew;  }
}
