import { Routes } from '@angular/router';

import { DashboardComponent } from './domains/dashboard/pages/dashboard.component';
import { ManageInventoryComponent } from './domains/dashboard/pages/manage-inventory';
import { LiveOrdersComponent } from './domains/order/pages/live-orders.component';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { OrderHistoryComponent } from './domains/order/pages/order-history.component';
import { RoleManagementComponent } from './domains/roleManagement/pages/role-management.component';

export const routes: Routes = [

  // ✅ MAIN LAYOUT (ADMIN PANEL)
  {
    path: '',
    component: AppLayoutComponent,
    children: [

      // ✅ DASHBOARD
      { path: 'dashboard', component: DashboardComponent },

      // ✅ INVENTORY MODULE
      {
        path: 'inventory',
        children: [
          { path: 'dashboard', component: DashboardComponent },
          { path: 'manage', component: ManageInventoryComponent },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },

      // ✅ ORDERS MODULE
      {
        path: 'orders',
        children: [
          { path: 'live', component: LiveOrdersComponent },
          { path: 'history', component: OrderHistoryComponent }, // future
          { path: '', redirectTo: 'live', pathMatch: 'full' }
        ]
      },

      // ✅ POS MODULE (LAZY LOADED)
      {
        path: 'pos',
        loadChildren: () =>
          import('./domains/pos/pos.module').then(m => m.PosModule)
      },

      // ✅ SYSTEM MODULE (future)
      { path: 'settings', component: RoleManagementComponent },
      // { path: 'qr', loadComponent: () => import('./system/qr/qr.component').then(m => m.QrComponent) },
      // { path: 'settings', loadComponent: () => import('./system/settings/settings.component').then(m => m.SettingsComponent) },

      // ✅ DEFAULT
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // ✅ FALLBACK
  { path: '**', redirectTo: 'dashboard' }
];
