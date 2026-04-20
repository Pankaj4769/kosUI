import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {

  isSidebarCollapsed = false;

  toggle(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    localStorage.setItem('sidebar', String(this.isSidebarCollapsed));
  }

  collapse(): void {
    this.isSidebarCollapsed = true;
    localStorage.setItem('sidebar', 'true');
  }

  expand(): void {
    this.isSidebarCollapsed = false;
    localStorage.setItem('sidebar', 'false');
  }

  init(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 767) {
      this.isSidebarCollapsed = true;
      return;
    }
    this.isSidebarCollapsed = localStorage.getItem('sidebar') === 'true';
  }
}
