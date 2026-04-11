import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {

  newPassword     = '';
  confirmPassword = '';
  showNew         = false;
  showConfirm     = false;
  isLoading       = false;
  errorMessage    = '';
  successMessage  = '';

  constructor(private auth: AuthService, private router: Router) {
    // If user is not logged in or doesn't need reset, send them away
    const user = this.auth.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
    } else if (!user.mustResetPassword) {
      this.auth.handlePostLogin(user);
    }
  }

  get username(): string {
    return this.auth.currentUser?.username ?? '';
  }

  get displayName(): string {
    return this.auth.currentUser?.name ?? 'there';
  }

  onSubmit(): void {
    this.errorMessage   = '';
    this.successMessage = '';

    if (!this.newPassword || this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.auth.resetTempPassword(this.username, this.newPassword).subscribe({
      next: updatedUser => {
        this.isLoading      = false;
        this.successMessage = 'Password updated successfully! Redirecting…';
        setTimeout(() => {
          const user = this.auth.currentUser;
          if (user) this.auth.handlePostLogin(user);
        }, 1200);
      },
      error: () => {
        this.isLoading    = false;
        this.errorMessage = 'Failed to update password. Please try again.';
      }
    });
  }
}
