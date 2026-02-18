import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthUser } from '../../auth/auth.model';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pending-approval.component.html',
  styleUrls: ['./pending-approval.component.css']
})
export class PendingApprovalComponent implements OnInit, OnDestroy {

  user: AuthUser | null = null;  // ✅ declare only, no assignment
  private pollInterval: any;

  constructor(private auth: AuthService, private router: Router) {
    this.user = this.auth.currentUser;  // ✅ assign inside constructor
  }
  ngOnInit(): void {
    // Poll every 10s to check approval status (swap with WebSocket in production)
    this.pollInterval = setInterval(() => this.checkStatus(), 10000);
  }

  checkStatus(): void {
    const user = this.auth.currentUser;
    if (user?.onboardingStatus === 'APPROVED') {
      clearInterval(this.pollInterval);
      this.router.navigate(['/onboarding/setup']);
    }
  }

  logout(): void { this.auth.logout(); }

  ngOnDestroy(): void { clearInterval(this.pollInterval); }
}
