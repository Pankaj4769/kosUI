import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FeatureKey, FEATURE_ACCESS, PLAN_META } from '../../../core/config/feature-access.config';
import { SubscriptionPlan } from '../../../core/auth/auth.model';

@Component({
  selector: 'app-upgrade-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upgrade-prompt.component.html',
  styleUrls: ['./upgrade-prompt.component.css']
})
export class UpgradePromptComponent implements OnInit {

  @Input() feature!: FeatureKey;

  requiredPlan!: SubscriptionPlan;
  planLabel!: string;
  planPrice!: string;
  planTagline!: string;
  featureLabel!: string;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const config   = FEATURE_ACCESS[this.feature];
    const planMeta = PLAN_META[config.minPlan];

    this.requiredPlan  = config.minPlan;
    this.featureLabel  = config.label;
    this.planLabel     = planMeta.label;
    this.planPrice     = planMeta.price;
    this.planTagline   = planMeta.tagline;
  }

  upgrade(): void {
    this.router.navigate(['/onboarding/subscription'], {
      queryParams: { highlight: this.requiredPlan }
    });
  }
}
