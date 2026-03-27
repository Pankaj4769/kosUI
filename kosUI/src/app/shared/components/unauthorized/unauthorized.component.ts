import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div class="unauth-page">
      <div class="unauth-card">
        <span class="unauth-icon">🚫</span>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button (click)="goBack()">Go Back</button>
      </div>
    </div>
  `,
  styles: [`
    .unauth-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
    }
    .unauth-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 40px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      text-align: center;
    }
    .unauth-icon { font-size: 40px; }
    h2 { margin: 0; font-size: 22px; color: #1f2937; }
    p  { margin: 0; font-size: 14px; color: #6b7280; }
    button {
      margin-top: 8px;
      padding: 10px 24px;
      background: #f97316;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #ea6c0a; }
  `]
})
export class UnauthorizedComponent {
  constructor(private router: Router) {}
  goBack(): void { this.router.navigate(['/dashboard']); }
}
