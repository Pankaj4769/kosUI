import { Routes } from '@angular/router';

import { DashboardComponent } from './inventory/inventory-dashboard/dashboard.component';
import { ManageInventoryComponent } from './inventory/manage-inventory/manage-inventory';

export const routes: Routes = [

  {
    path: 'dashboard',
    component: DashboardComponent
  },

  {
    path: 'manage-inventory',
    component: ManageInventoryComponent
  },

  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }

];
