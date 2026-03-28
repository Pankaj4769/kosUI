import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureKey } from '../config/feature-access.config';
import { AccessService } from '../services/access.service';

/**
 * Factory that returns a route guard enforcing both role + plan access.
 *
 * Usage in app.routes.ts:
 *   {
 *     path: 'reports/advanced',
 *     component: AdvancedReportsComponent,
 *     canActivate: [accessGuard('advanced-analytics')]
 *   }
 *
 * - Plan-blocked  → /upgrade  (upsell page)
 * - Role-blocked  → /unauthorized
 */
export function accessGuard(feature: FeatureKey): CanActivateFn {
  return () => {
    const access = inject(AccessService);
    const router = inject(Router);

    const reason = access.getDenyReason(feature);

    if (!reason) return true;

    if (reason === 'plan') {
      return router.createUrlTree(['/upgrade'], {
        queryParams: { feature, requiredPlan: access.requiredPlan(feature) }
      });
    }

    // role-blocked
    return router.createUrlTree(['/unauthorized']);
  };
}
