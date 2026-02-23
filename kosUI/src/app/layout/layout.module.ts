import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AppLayoutComponent } from './app-layout/app-layout.component';
import { HeaderComponent }    from './header/header.component';
import { SidebarComponent }   from './sidebar/sidebar.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    AppLayoutComponent,       // ✅ standalone — goes in imports[]
    HeaderComponent,          // ✅ standalone — goes in imports[]
    SidebarComponent          // ✅ standalone — goes in imports[]
  ],
  exports: [
    AppLayoutComponent        // ✅ re-export so app.module.ts can use <app-layout>
  ]
})
export class LayoutModule {}
