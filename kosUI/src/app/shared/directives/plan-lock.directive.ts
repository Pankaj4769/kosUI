import {
  Directive,
  Input,
  OnInit,
  ElementRef,
  Renderer2
} from '@angular/core';
import { FeatureKey, FEATURE_ACCESS, PLAN_META } from '../../core/config/feature-access.config';
import { AccessService } from '../../core/services/access.service';

/**
 * Attribute directive — keeps the element in the DOM but visually locks it
 * when the user's plan is insufficient. Useful for upsell scenarios.
 *
 * Role-blocked features are hidden silently (no upsell).
 * Plan-blocked features get: disabled state + lock icon overlay + tooltip.
 *
 * Usage:
 *   <button [appPlanLock]="'multi-terminal-pos'">Multi-Terminal POS</button>
 *   <li   [appPlanLock]="'advanced-analytics'">Advanced Analytics</li>
 */
@Directive({
  selector: '[appPlanLock]',
  standalone: true
})
export class PlanLockDirective implements OnInit {

  @Input('appPlanLock') feature!: FeatureKey;

  constructor(
    private el:     ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private access: AccessService
  ) {}

  ngOnInit(): void {
    const reason = this.access.getDenyReason(this.feature);

    if (!reason) return; // full access — do nothing

    if (reason === 'role') {
      // Role-blocked: hide element without upsell messaging
      this.renderer.setStyle(this.el.nativeElement, 'display', 'none');
      return;
    }

    // Plan-blocked: lock visually and show upgrade tooltip
    const minPlan = FEATURE_ACCESS[this.feature].minPlan;
    const planMeta = PLAN_META[minPlan];
    const featureLabel = FEATURE_ACCESS[this.feature].label;

    const el = this.el.nativeElement;

    this.renderer.addClass(el, 'plan-locked');
    this.renderer.setAttribute(el, 'disabled', 'true');
    this.renderer.setAttribute(el, 'aria-disabled', 'true');
    this.renderer.setAttribute(
      el,
      'title',
      `${featureLabel} requires the ${planMeta.label} plan (${planMeta.price}). Upgrade to unlock.`
    );

    // Inject a small lock badge as a sibling overlay
    const wrapper = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(wrapper, 'plan-lock-badge');
    this.renderer.setAttribute(wrapper, 'aria-hidden', 'true');
    wrapper.textContent = '🔒';
    this.renderer.insertBefore(el.parentNode, wrapper, el.nextSibling);
  }
}
