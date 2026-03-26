import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser, CompleteSetup, LoginRequest, OnboardingStatus, RestaurantSetup, SubscriptionPlan, UserRole } from './auth.model';
import { HttpClient } from '@angular/common/http';
import { EMPTY, map, Observable, of, switchMap, tap, catchError } from 'rxjs';
import { BASE_URL } from '../../apiUrls';
import { SignupForm } from '../component/sign-up/signup.component';


interface LoginResponse {
  accessToken: string;
}


interface SignUpResponse {
  message: string,
  status: boolean
}

interface MessageResponse {
  message: string;
  status: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  readonly STORAGE_KEY = 'kos_user';

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
      catchError((err) => {
        const msg = err.status === 401
          ? 'Incorrect username, password, or role.'
          : 'Login failed. Please try again.';
        return of({ success: false, message: msg });
      }),
      switchMap((res: LoginResponse | { success: boolean; message: string }) => {
        if ('success' in res) {
          return of(res as { success: boolean; message: string });
        }
        const loginRes = res as LoginResponse;
        let user: AuthUser | undefined;

        if (!loginRes.accessToken) {
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
    if (
        user.onboardingStatus === 'PENDING') {
      this.router.navigate(['/onboarding/pending']);
      return;
    }
    if (user.onboardingStatus === 'COMPLETED') {
      this.router.navigate(['/onboarding/setup']);
      return;
    }
    // SETUP_COMPLETE → normal role-based redirect
    this.redirectByRole(user.role);
  }

  // ── Update Onboarding Status ─────────────────────────────
  updateOnboardingStatus(status: OnboardingStatus,restaurent: RestaurantSetup, plan?: SubscriptionPlan) {
    const user = this.currentUser;
    if (!user) 
      return EMPTY;
    user.onboardingStatus = status;
    if (plan) {
      let setup:  CompleteSetup  = {
        plan: plan,
        onboardingStatus: status,
        restaurentId: user.restaurantId ?? '',
        restaurant: restaurent
      };
      user.subscriptionPlan = plan;
      return this.http.patch(this.baseUrl+'/api/subscription/completeSetup', setup);
    }
    return EMPTY;
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

  checkUsername(username: string): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${this.baseUrl}/auth/checkUsername/${username}`);
  }

  forgotPassword(username: string, newPassword: string): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/auth/forgotPassword`, { username, newPassword });
  }

}
