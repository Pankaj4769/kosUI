
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isLoggedIn && (this.authService.currentUser?.subscriptionPlan != null || this.authService.currentUser?.subscriptionPlan != undefined )) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}
