import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';


export type PlanTier = 'starter' | 'professional' | 'enterprise';


export interface SignupForm {
  restaurantName: string;
  fullName: string;
  email: string;
  mobile: string;
  username: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}


@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnDestroy {


  // ── Form Model ─────────────────────────────────────────
  form: SignupForm = {
    restaurantName: '',
    fullName: '',
    email: '',
    mobile: '',
    username: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  };


  // ── UI State ───────────────────────────────────────────
  showPassword        = false;
  showConfirmPassword = false;
  isLoading           = false;
  errorMessage        = '';
  successMessage      = '';
  currentStep         = 1;
  readonly totalSteps = 2;
  showSuccessModal    = false;
  redirectCountdown   = 3;

  // ── Field Touched Flags ────────────────────────────────
  emailTouched    = false;
  mobileTouched   = false;
  usernameTouched = false;

  // ── Mobile OTP ─────────────────────────────────────────
  mobileOtpSent     = false;
  mobileOtpVerified = false;
  mobileOtp         = '';
  mobileOtpError    = '';
  mobileOtpLoading  = false;
  mobileResendTimer = 0;

  // ── Email OTP ──────────────────────────────────────────
  emailOtpSent     = false;
  emailOtpVerified = false;
  emailOtp         = '';
  emailOtpError    = '';
  emailOtpLoading  = false;
  emailResendTimer  = 0;

  // ── Username Availability ──────────────────────────────
  usernameChecking   = false;
  usernameAvailable: boolean | null = null;
  usernameCheckError = false;

  private usernameInput$ = new Subject<string>();
  private destroy$       = new Subject<void>();


  // ── Password Strength ──────────────────────────────────
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  passwordStrengthLabel = '';


  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    if (this.auth.isLoggedIn) this.auth.handlePostLogin(this.auth.currentUser!);

    // Username availability check with debounce
    this.usernameInput$.pipe(
      debounceTime(600),
      distinctUntilChanged(),
      switchMap(username => {
        if (!this.isUsernameValid) {
          this.usernameAvailable  = null;
          this.usernameCheckError = false;
          this.cdr.detectChanges();
          return of(null);
        }
        this.usernameChecking   = true;
        this.usernameAvailable  = null;
        this.usernameCheckError = false;
        this.cdr.detectChanges();
        return this.auth.checkUsername(username).pipe(
          catchError((err) => {
            if (err.status === 404) {
              // 404 = username not found → available to use
              this.usernameChecking   = false;
              this.usernameAvailable  = true;
              this.usernameCheckError = false;
            } else {
              this.usernameCheckError = true;
              this.usernameChecking   = false;
              this.usernameAvailable  = null;
            }
            this.cdr.detectChanges();
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result === null) return;
      // 200 means username exists → taken → not available
      this.usernameChecking  = false;
      this.usernameAvailable = false;
      this.cdr.detectChanges();
    });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  // ── Navigation ─────────────────────────────────────────
  nextStep(): void {
    if (this.validateStep(this.currentStep)) {
      this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
      this.errorMessage = '';
    }
  }


  prevStep(): void {
    this.currentStep = Math.max(this.currentStep - 1, 1);
    this.errorMessage = '';
  }


  // ── Step Validation ────────────────────────────────────
  private validateStep(step: number): boolean {
    this.errorMessage = '';

    if (step === 1) {
      if (!this.form.restaurantName.trim()) {
        this.errorMessage = 'Restaurant / business name is required.'; return false;
      }
      if (!this.form.fullName.trim()) {
        this.errorMessage = 'Full name is required.'; return false;
      }
      if (!this.form.email.trim() || !this.isValidEmail(this.form.email)) {
        this.errorMessage = 'Enter a valid email address.'; return false;
      }
      if (!this.emailOtpVerified) {
        this.errorMessage = 'Please verify your email address with OTP.'; return false;
      }
      if (!this.form.mobile || !this.isMobileValid) {
        this.errorMessage = 'Enter a valid 10-digit mobile number.'; return false;
      }
      if (!this.mobileOtpVerified) {
        this.errorMessage = 'Please verify your mobile number with OTP.'; return false;
      }
    }

    if (step === 2) {
      if (!this.form.username.trim()) {
        this.errorMessage = 'Username is required.'; return false;
      }
      if (this.usernameChecking) {
        this.errorMessage = 'Checking username availability, please wait.'; return false;
      }
      if (this.usernameCheckError) {
        this.errorMessage = 'Could not verify username. Please check your connection and try again.'; return false;
      }
      if (this.usernameAvailable !== true) {
        this.errorMessage = 'Please choose an available username.'; return false;
      }
      if (!this.form.password || this.form.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters.'; return false;
      }
      if (this.form.password !== this.form.confirmPassword) {
        this.errorMessage = 'Passwords do not match.'; return false;
      }
      if (!this.form.acceptTerms) {
        this.errorMessage = 'Please accept the terms to continue.'; return false;
      }
    }

    return true;
  }


  // ── Password Strength ──────────────────────────────────
  onPasswordChange(): void {
    const p = this.form.password;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    this.passwordStrength      = score as 0 | 1 | 2 | 3 | 4;
    this.passwordStrengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  }


  // ── Submit ─────────────────────────────────────────────
  onSubmit(): void {
    if (!this.validateStep(2)) return;
    this.isLoading    = true;
    this.errorMessage = '';

    setTimeout(() => {

      this.auth.signUp(this.form).subscribe(res =>{
        if(res.status){
          this.isLoading = false;
          this.showSuccessModal = true;
          this.redirectCountdown = 3;
          this.cdr.detectChanges();
          const interval = setInterval(() => {
            this.redirectCountdown--;
            this.cdr.detectChanges();
            if (this.redirectCountdown <= 0) {
              clearInterval(interval);
              this.router.navigate(['/login']);
            }
          }, 1000);
        }else{
          this.isLoading = false;
          this.errorMessage = `Sign up failed for some reason.Try in some time.`;
        }
      });      
    }, 1000);
  }


  // ── Helpers ────────────────────────────────────────────
  togglePassword():        void { this.showPassword        = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }
  goToLogin():             void { this.router.navigate(['/login']); }

  // ── Field Validation Getters ───────────────────────────
  get isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.form.email.trim());
  }

  get emailError(): string {
    if (!this.emailTouched || !this.form.email) return '';
    return this.isEmailValid ? '' : 'Enter a valid email address (e.g. name@domain.com)';
  }

  get isMobileValid(): boolean {
    return /^[6-9]\d{9}$/.test(this.form.mobile);
  }

  get mobileError(): string {
    if (!this.mobileTouched || !this.form.mobile) return '';
    if (!/^\d+$/.test(this.form.mobile)) return 'Mobile number must contain digits only';
    if (!/^[6-9]/.test(this.form.mobile))  return 'Mobile number must start with 6, 7, 8, or 9';
    if (this.form.mobile.length < 10)       return 'Mobile number must be exactly 10 digits';
    return '';
  }

  get isUsernameValid(): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/.test(this.form.username.trim());
  }

  get usernameError(): string {
    if (!this.usernameTouched || !this.form.username) return '';
    if (!/^[a-zA-Z]/.test(this.form.username))         return 'Username must start with a letter';
    if (/[^a-zA-Z0-9_]/.test(this.form.username))      return 'Only letters, numbers and underscores allowed';
    if (this.form.username.length < 3)                  return 'Username must be at least 3 characters';
    if (this.form.username.length > 20)                 return 'Username must be at most 20 characters';
    return '';
  }

  // ── Mobile OTP ─────────────────────────────────────────
  sendMobileOtp(): void {
    this.mobileOtpLoading = true;
    this.mobileOtpError   = '';
    setTimeout(() => {
      this.mobileOtpSent    = true;
      this.mobileOtpLoading = false;
      this.mobileOtp        = '';
      this.startResendTimer('mobile');
    }, 800);
  }

  verifyMobileOtp(): void {
    if (!this.mobileOtp.trim()) { this.mobileOtpError = 'Please enter the OTP.'; return; }
    if (this.mobileOtp === '123456') {
      this.mobileOtpVerified = true;
      this.mobileOtpError    = '';
    } else {
      this.mobileOtpError = 'Invalid OTP. Please try again.';
    }
  }

  // ── Email OTP ──────────────────────────────────────────
  sendEmailOtp(): void {
    this.emailOtpLoading = true;
    this.emailOtpError   = '';
    setTimeout(() => {
      this.emailOtpSent    = true;
      this.emailOtpLoading = false;
      this.emailOtp        = '';
      this.startResendTimer('email');
    }, 800);
  }

  verifyEmailOtp(): void {
    if (!this.emailOtp.trim()) { this.emailOtpError = 'Please enter the OTP.'; return; }
    if (this.emailOtp === '123456') {
      this.emailOtpVerified = true;
      this.emailOtpError    = '';
    } else {
      this.emailOtpError = 'Invalid OTP. Please try again.';
    }
  }

  // ── OTP only digits ───────────────────────────────────
  onOtpInput(field: 'mobile' | 'email'): void {
    if (field === 'mobile') this.mobileOtp = this.mobileOtp.replace(/\D/g, '');
    else                    this.emailOtp  = this.emailOtp.replace(/\D/g, '');
  }

  // ── Resend cooldown (30s) ─────────────────────────────
  private startResendTimer(field: 'mobile' | 'email'): void {
    if (field === 'mobile') this.mobileResendTimer = 30;
    else                    this.emailResendTimer  = 30;
    const tick = setInterval(() => {
      if (field === 'mobile') { this.mobileResendTimer--; if (this.mobileResendTimer <= 0) clearInterval(tick); }
      else                    { this.emailResendTimer--;  if (this.emailResendTimer  <= 0) clearInterval(tick); }
      this.cdr.detectChanges();
    }, 1000);
  }

  // ── Mobile: allow digits only, reset OTP if changed ───
  onMobileInput(): void {
    this.form.mobile = this.form.mobile.replace(/\D/g, '');
    this.mobileTouched = true;
    if (this.mobileOtpSent || this.mobileOtpVerified) {
      this.mobileOtpSent = false; this.mobileOtpVerified = false;
      this.mobileOtp = ''; this.mobileOtpError = '';
    }
  }

  // ── Email: reset OTP if changed ────────────────────────
  onEmailChange(): void {
    this.emailTouched = true;
    if (this.emailOtpSent || this.emailOtpVerified) {
      this.emailOtpSent = false; this.emailOtpVerified = false;
      this.emailOtp = ''; this.emailOtpError = '';
    }
  }

  // ── Username: strip spaces, trigger availability check ─
  onUsernameInput(): void {
    this.form.username      = this.form.username.replace(/\s/g, '');
    this.usernameTouched    = true;
    this.usernameAvailable  = null;
    this.usernameCheckError = false;
    this.usernameInput$.next(this.form.username);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }


  // ── Dev Quick-fill ─────────────────────────────────────
  quickFill(): void {
    this.form = {
      restaurantName: 'KOS Demo Kitchen',
      fullName:       'Demo Owner',
      email:          'owner@kos.demo',
      mobile:         '9876543210',
      username:       'demoowner',
      password:       'Demo@1234',
      confirmPassword:'Demo@1234',
      acceptTerms:    true
    };
    this.currentStep           = 1;
    this.passwordStrength      = 3;
    this.passwordStrengthLabel = 'Good';
    // Pre-verify OTP fields for dev convenience
    this.emailTouched      = true;  this.emailOtpSent      = true;  this.emailOtpVerified  = true;
    this.mobileTouched     = true;  this.mobileOtpSent     = true;  this.mobileOtpVerified = true;
    this.usernameTouched   = true;  this.usernameAvailable = true;
  }
}
