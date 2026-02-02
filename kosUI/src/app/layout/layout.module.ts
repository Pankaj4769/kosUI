import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { AppLayoutComponent } from './app-layout/app-layout.component';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@NgModule({
  declarations: [
    AppLayoutComponent // ✅ only non-standalone component
  ],
  imports: [
    CommonModule,

    // ✅ Router for layout-level navigation
    RouterModule.forChild([]),

    // ✅ Standalone components
    HeaderComponent,
    SidebarComponent
  ],
  exports: [
    AppLayoutComponent
  ]
})
export class LayoutModule {}
