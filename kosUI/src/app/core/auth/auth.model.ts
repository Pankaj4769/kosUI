export type UserRole =
  'ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' |
  'BILLING_ASSISTANT' | 'CHEF' | 'WAITER';

export type SubscriptionPlan = 'BASIC' | 'BASIC_PLUS' | 'PREMIUM' | 'ULTRA';

export type OnboardingStatus =
  'NEW' | 'SUBSCRIPTION_SELECTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'SETUP_COMPLETE';

export type LoginMethod = 'PASSWORD' | 'MOBILE_OTP' | 'GOOGLE' | 'ZOHO';

export interface LoginRequest {
  username?: string;
  password?: string;
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
  features: string[];
  popular?: boolean;
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
