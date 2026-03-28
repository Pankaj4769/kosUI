import { Injectable } from '@angular/core';
import { FeatureKey, FEATURE_ACCESS } from '../config/feature-access.config';
import { RoleService } from './role.service';
import { PlanService } from './plan.service';

export type AccessDenyReason = 'role' | 'plan' | null;

@Injectable({ providedIn: 'root' })
export class AccessService {

  constructor(
    private role: RoleService,
    private plan: PlanService
  ) {}

  /**
   * Main gate — true only when BOTH role and plan requirements are satisfied.
   */
  canAccess(feature: FeatureKey): boolean {
    const config = FEATURE_ACCESS[feature];
    return this.role.hasRole(config.roles) && this.plan.hasPlan(config.minPlan);
  }

  /**
   * Returns why access was denied, or null if access is granted.
   * Useful for driving "No permission" vs "Upgrade your plan" messages.
   *
   * Priority: role is checked first — a role block is not surfaced as a plan
   * upsell opportunity (the user legitimately cannot use this feature).
   */
  getDenyReason(feature: FeatureKey): AccessDenyReason {
    const config = FEATURE_ACCESS[feature];
    if (!this.role.hasRole(config.roles)) return 'role';
    if (!this.plan.hasPlan(config.minPlan)) return 'plan';
    return null;
  }

  /** Convenience: true when role passes but plan blocks (upsell scenario) */
  isPlanLocked(feature: FeatureKey): boolean {
    return this.getDenyReason(feature) === 'plan';
  }

  /** Required plan label for a feature, e.g. "PRO" */
  requiredPlan(feature: FeatureKey): string {
    return FEATURE_ACCESS[feature].minPlan;
  }

  /** Human-readable label for a feature */
  featureLabel(feature: FeatureKey): string {
    return FEATURE_ACCESS[feature].label;
  }
}
