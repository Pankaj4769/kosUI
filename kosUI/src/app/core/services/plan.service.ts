import { Injectable } from '@angular/core';
import { SubscriptionPlan } from '../auth/auth.model';
import { PLAN_RANK } from '../config/feature-access.config';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class PlanService {

  constructor(private auth: AuthService) {}

  get currentPlan(): SubscriptionPlan | null {
    return this.auth.currentUser?.subscriptionPlan ?? null;
  }

  /**
   * Returns true if the user's current plan meets or exceeds `minPlan`.
   * If the user has no plan yet (onboarding), returns false.
   */
  hasPlan(minPlan: SubscriptionPlan): boolean {
    const current = this.currentPlan;
    if (!current) return false;
    return PLAN_RANK[current] >= PLAN_RANK[minPlan];
  }

  /** True if currently on exactly this plan */
  isPlan(plan: SubscriptionPlan): boolean {
    return this.currentPlan === plan;
  }
}
