import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import { FeatureKey } from '../../core/config/feature-access.config';
import { AccessService } from '../../core/services/access.service';

/**
 * Structural directive — removes the host element from the DOM entirely
 * when the user lacks the required role + plan combination.
 *
 * Usage:
 *   <button *appAccess="'payroll'">Run Payroll</button>
 *
 *   <!-- with else template -->
 *   <div *appAccess="'advanced-analytics'; else upgradeBlock">...</div>
 *   <ng-template #upgradeBlock><app-upgrade-prompt feature="advanced-analytics"/></ng-template>
 */
@Directive({
  selector: '[appAccess]',
  standalone: true
})
export class AppAccessDirective implements OnInit {

  @Input('appAccess')         feature!: FeatureKey;
  @Input('appAccessElse')     elseTemplate?: TemplateRef<unknown>;

  private rendered = false;

  constructor(
    private tpl:  TemplateRef<unknown>,
    private vcr:  ViewContainerRef,
    private access: AccessService
  ) {}

  ngOnInit(): void {
    if (this.access.canAccess(this.feature)) {
      this.vcr.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (this.elseTemplate) {
      this.vcr.createEmbeddedView(this.elseTemplate);
    }
  }
}
