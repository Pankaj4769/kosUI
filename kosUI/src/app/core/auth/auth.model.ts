export type UserRole =
  'ADMIN' | 'OWNER' | 'MANAGER' | 'CASHIER' |
  'BILLING_ASSISTANT' | 'CHEF' | 'WAITER';

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';

export type OnboardingStatus =
  'NEW'  | 'PENDING' | 'COMPLETED' | 'SETUP_COMPLETE';

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

export interface PaymentRequest{
  name: string;
  email: string; 
  phone: string; 
  restaurantName: string;
  message: string;
  plan?: string | null;
}

export interface PaymentResponse{
  paymentStatus: boolean;
  activePlan: string;

}


export interface CompleteSetup{
  plan: SubscriptionPlan;
  onboardingStatus: string;
  restaurentId: string;
  restaurant: RestaurantSetup;
}

export type IdentifierType = 'username' | 'email' | 'mobile';

export interface ForgotPasswordRequest {
  identifier: string;
  identifierType: IdentifierType;
  newPassword: string;
}
