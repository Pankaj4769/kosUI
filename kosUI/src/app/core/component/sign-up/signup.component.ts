import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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


  // ── Password Strength ──────────────────────────────────
  passwordStrength: 0 | 1 | 2 | 3 | 4 = 0;
  passwordStrengthLabel = '';


  constructor(private auth: AuthService, private router: Router) {
    if (this.auth.isLoggedIn) this.auth.handlePostLogin(this.auth.currentUser!);
  }


  ngOnDestroy(): void {}


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
      if (!this.form.mobile || this.form.mobile.length < 10) {
        this.errorMessage = 'Enter a valid 10-digit mobile number.'; return false;
      }
    }

    if (step === 2) {
      if (!this.form.username.trim()) {
        this.errorMessage = 'Username is required.'; return false;
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
          this.successMessage = `Account created! Welcome, ${this.form.fullName.split(' ')[0]}.`;
          this.isLoading = false;
          setTimeout(() => this.router.navigate(['/login']), 2000);
        }else{
          this.errorMessage = `Sign up failed for some reason.Try in some time.`;
        }
      });      
    }, 1000);
  }


  // ── Helpers ────────────────────────────────────────────
  togglePassword():        void { this.showPassword        = !this.showPassword; }
  toggleConfirmPassword(): void { this.showConfirmPassword = !this.showConfirmPassword; }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }


  // ── Dev Quick-fill ─────────────────────────────────────
  quickFill(): void {
    this.form = {
      restaurantName: 'KOS Demo Kitchen',
      fullName:       'Demo Owner',
      email:          'owner@kos.demo',
      mobile:         '9876543210',
      username:       'demoowner',
      password:       'kos123',
      confirmPassword:'kos123',
      acceptTerms:    true
    };
    this.currentStep          = 1;
    this.passwordStrength     = 1;
    this.passwordStrengthLabel = 'Weak';
  }
}
