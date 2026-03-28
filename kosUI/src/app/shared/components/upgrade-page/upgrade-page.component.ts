import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UpgradePromptComponent } from '../upgrade-prompt/upgrade-prompt.component';
import { FeatureKey } from '../../../core/config/feature-access.config';

@Component({
  selector: 'app-upgrade-page',
  standalone: true,
  imports: [CommonModule, UpgradePromptComponent],
  template: `
    <div class="upgrade-page">
      <app-upgrade-prompt *ngIf="feature" [feature]="feature" />
    </div>
  `,
  styles: [`
    .upgrade-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 24px;
    }
  `]
})
export class UpgradePageComponent implements OnInit {
  feature!: FeatureKey;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.feature = this.route.snapshot.queryParamMap.get('feature') as FeatureKey;
  }
}
