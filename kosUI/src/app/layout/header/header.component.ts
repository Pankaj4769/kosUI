import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {

  userName = 'Admin';
  showUserMenu = false;

  constructor(
    public layout: LayoutService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.layout.toggle();
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    console.log('Logout clicked');
    // TODO: integrate auth logout
    this.router.navigate(['/login']);
  }
}
