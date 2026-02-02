import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  private collapsed = false;

  isCollapsed() {
    return this.collapsed;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('sidebar', String(this.collapsed));
  }

  init() {
    this.collapsed = localStorage.getItem('sidebar') === 'true';
  }
}
