import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

import { HeaderComponent }  from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LayoutService }    from '../../core/services/layout.service';

const AUTH_ROUTES = ['/login','/signup', '/register', '/forgot-password', '/reset-password', '/onboarding/subscription', '/onboarding/pending', '/onboarding/payment'];

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    SidebarComponent
  ],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent implements OnInit, OnDestroy {

  isAuthPage = false;

  private destroy$ = new Subject<void>();

  constructor(
    public  layout: LayoutService,   // public — used in template
    private router: Router,
    private cdr:    ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkRoute(this.router.url);

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e: any) => {
        this.checkRoute(e.urlAfterRedirects);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkRoute(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.isAuthPage = AUTH_ROUTES.some(route => path.startsWith(route));
  }
}
