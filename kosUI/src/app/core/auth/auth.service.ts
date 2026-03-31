import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUser, CompleteSetup, ForgotPasswordRequest, LoginRequest, OnboardingStatus, RestaurantSetup, SubscriptionPlan, UserRole } from './auth.model';
import { HttpClient } from '@angular/common/http';
import { EMPTY, map, Observable, of, switchMap, tap, catchError } from 'rxjs';
import { BASE_URL } from '../../apiUrls';
import { SignupForm } from '../component/sign-up/signup.component';
import { MessageResponse } from '../../domains/dashboard/models/message.model';


interface LoginResponse {
  accessToken: string;
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
    if (req.method === 'GOOGLE') {
      return this.loginWithGoogle();
    }

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
        }

        if (!user) {
          return of({ success: false, message: 'Invalid credentials. Please try again.' });
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        this.handlePostLogin(user);
        return of({ success: true, message: '' });
      })
    );
  }

  // ── Google OAuth Login (native GIS) ─────────────────────
  private loginWithGoogle(): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const google = (window as any).google;
      if (!google) {
        observer.next({ success: false, message: 'Google Sign-In not loaded. Please refresh.' });
        observer.complete();
        return;
      }
      const client = google.accounts.oauth2.initTokenClient({
        client_id: '708877149972-chhn1086ntbko1e6hrg0jfaaci2t8fmr.apps.googleusercontent.com',
        scope: 'openid email profile',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            observer.next({ success: false, message: 'Google sign-in was cancelled.' });
            observer.complete();
            return;
          }
          // Use native fetch to bypass auth interceptor (avoid overwriting Google access token)
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          })
          .then(res => res.json())
          .then(profile => {
            // Single backend call — returns AuthUser with token embedded
            this.http.post<any>(`${this.baseUrl}/auth/google`, {
              email: profile.email,
              name:  profile.name
            }).subscribe({
              next: (res: any) => {
                const jwt: string = res.token ?? res.accessToken;
                if (!jwt) {
                  observer.next({ success: false, message: 'Login error: no token received.' });
                  observer.complete();
                  return;
                }
                // Build full AuthUser — backend may return partial data, fill gaps from Google profile
                const user: AuthUser = {
                  staffId:          res.staffId   ?? '',
                  name:             res.name       ?? profile.name,
                  username:         res.username   ?? profile.email,
                  email:            res.email      ?? profile.email,
                  role:             res.role       ?? 'OWNER',
                  token:            jwt,
                  isFirstTime:      res.isFirstTime ?? res.firstTime ?? true,
                  onboardingStatus: res.onboardingStatus ?? 'NEW',
                  subscriptionPlan: res.subscriptionPlan ?? undefined,
                  restaurantId:     res.restaurantId ?? undefined
                };
                localStorage.setItem('token', jwt);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
                this.handlePostLogin(user);
                observer.next({ success: true, message: '' });
                observer.complete();
              },
              error: () => {
                observer.next({ success: false, message: 'Google login failed. Please try again.' });
                observer.complete();
              }
            });
          })
          .catch(() => {
            observer.next({ success: false, message: 'Failed to fetch Google profile.' });
            observer.complete();
          });
        }
      });
      client.requestAccessToken();
    });
  }
  

  // ── OTP Send (mock) ──────────────────────────────────────
  sendOtp(mobile: string): { success: boolean; message: string } {
    console.log(`OTP sent to ${mobile}: 123456 (mock)`);
    return { success: true, message: 'OTP sent successfully.' };
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
    // If subscriptionPlan is missing (backend didn't return it), send to subscription page
    if (!user.subscriptionPlan) {
      this.router.navigate(['/onboarding/subscription']);
      return;
    }
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
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
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

  signUp(form: SignupForm): Observable<MessageResponse>{
    return this.http.post<MessageResponse>(`${this.baseUrl}/auth/signUp`, form);
  }

  checkUsername(username: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.baseUrl}/auth/getUser/${username}`);
  }

  forgotPassword(req: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/auth/forgotPassword`, req);
  }

}
