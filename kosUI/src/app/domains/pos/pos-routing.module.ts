import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Optional: POS Shell Component (if you have PosComponent)
import { PosComponent } from './pos.component';

import { StaffDashboardComponent } from '../staff/pages/staff-dashboard.component'

// Standalone components (lazy loaded)
const routes: Routes = [
  {
    path: '',
    component: PosComponent, // ✅ POS layout wrapper (optional but recommended)
    children: [

      // ✅ Default POS Route → Cashier
      {
        path: '',
        redirectTo: 'cashier',
        pathMatch: 'full'
      },

      // ✅ CASHIER SCREEN
      {
        path: 'cashier',
        loadComponent: () =>
          import('./pages/cashier/cashier.component')
            .then(m => m.CashierComponent)
      },

      // ✅ MENU SCREEN
      {
        path: 'menu',
        loadComponent: () =>
          import('./components/menu-area/menu-area.component')
            .then(m => m.MenuAreaComponent)
      },

      // ✅ TABLE DASHBOARD (MAIN TABLE VIEW)
      {
        path: 'tables',
        loadComponent: () =>
          import('./pages/table-dashboard/table-dashboard.component')
            .then(m => m.TableDashboardComponent)
      },

      // ✅ TABLE MAP (FLOOR PLAN) - optional advanced feature
      {
        path: 'table-map',
        loadComponent: () =>
          import('./components/table-map/table-map.component')
            .then(m => m.TableMapComponent)
      },

      { path: 'staff', component: StaffDashboardComponent } // ✅ NEW STAFF DASHBOARD
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PosRoutingModule {}
