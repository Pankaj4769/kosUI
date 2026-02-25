import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser, LoginRequest, OnboardingStatus, SubscriptionPlan, UserRole } from './auth.model';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, switchMap, tap } from 'rxjs';
import { BASE_URL } from '../../apiUrls';
import { SignupForm } from '../component/sign-up/signup.component';


interface LoginResponse {
  accessToken: string;
}


interface SignUpResponse {
  message: string,
  status: boolean
}

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

  constructor(
    private router: Router,
    private http: HttpClient) {}

    private baseUrl = BASE_URL;
    preLogin(req: LoginRequest): Observable<LoginResponse> {
      let username = req.username;
      let password = req.password;
      let role = req.role;
      return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { username, password, role })
        .pipe(
          tap(response => {
            // Store token in localStorage
            localStorage.setItem('token', response.accessToken);

          })
        );
    }


  // ── Password Login ───────────────────────────────────────
  login(req: LoginRequest): Observable<{ success: boolean; message: string }> {
    if (!req.username && !req.password && !req.role) {
      return of({ success: false, message: 'Invalid credentials. Please try again.' });
    }
  
    return this.preLogin(req).pipe(
      switchMap((res :LoginResponse)=> {
        let user: AuthUser | undefined;
    
        if (!res.accessToken) {
          return of({ success: false, message: 'Invalid credentials. Please try again.' });
        }
        if (req.method === 'PASSWORD') {
          // Call the backend API and return the Observable directly
          return this.http.get<AuthUser>(`${this.baseUrl}/auth/getUser/${req.username}`).pipe(
            map(user => {
              if (!user) {
                return { success: false, message: 'Invalid credentials. Please try again.' };
              }
    
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
              this.handlePostLogin(user);
    
              return { success: true, message: '' };
            })
          );
        } else if (req.method === 'MOBILE_OTP') {
          user = this.mockUsers.find(u => u.mobile === req.mobile);
        } else if (req.method === 'GOOGLE' || req.method === 'ZOHO') {
          user = this.createSocialUser(req.method);
        }
    
        // Handle non-PASSWORD cases synchronously
        if (!user) {
          return of({ success: false, message: 'Invalid credentials. Please try again.' });
        }
    
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        this.handlePostLogin(user);
    
        return of({ success: true, message: '' });
      })
    );
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
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  get currentUser(): AuthUser | null {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  get isLoggedIn(): boolean {return !!this.getToken();}

  private redirectByRole(role: UserRole): void {
    const map: Record<UserRole, string> = {
      ADMIN: '/dashboard', OWNER: '/dashboard', MANAGER: '/dashboard',
      CASHIER: '/pos', BILLING_ASSISTANT: '/pos',
      CHEF: '/orders/live', WAITER: '/pos/tables'
    };
    this.router.navigate([map[role] ?? '/dashboard']);
  }

  signUp(form: SignupForm): Observable<SignUpResponse>{
    return this.http.post<SignUpResponse>(`${this.baseUrl}/auth/signUp`, form);
  }

}
