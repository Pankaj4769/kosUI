export type UserRole =
  'ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' |
  'BILLING_ASSISTANT' | 'CHEF' | 'WAITER';

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';

export type OnboardingStatus =
  'NEW' | 'SUBSCRIPTION_SELECTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'SETUP_COMPLETE';

export type LoginMethod = 'PASSWORD' | 'MOBILE_OTP' | 'GOOGLE' | 'ZOHO';

export interface LoginRequest {
  username?: string;
  password?: string;
  role?: string;
  mobile?: string;
  otp?: string;
  method: LoginMethod;
}

export interface AuthUser {
  staffId: string;
  name: string;
  username: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  token: string;
  isFirstTime: boolean;
  onboardingStatus: OnboardingStatus;
  subscriptionPlan?: SubscriptionPlan;
  restaurantId?: string;
}

export interface SubscriptionPlanDetail {
  id: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  staffLimit: number;
  annualPrice?: string; 
  tagline?: string;
  popular?: boolean;
  positioning: string;
  features: string[];
}

export interface StaffSetup {
  name: string;
  mobile: string;
  email: string;
  role: UserRole;
}

export interface RestaurantSetup {
  restaurantName: string;
  address: string;
  phone: string;
  email: string;
  staff: StaffSetup[];
}
