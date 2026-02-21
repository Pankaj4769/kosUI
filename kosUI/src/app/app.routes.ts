import { Routes } from '@angular/router';

import { DashboardComponent } from './domains/dashboard/pages/dashboard.component';
import { ManageInventoryComponent } from './domains/dashboard/pages/manage-inventory';
import { LiveOrdersComponent } from './domains/order/pages/live-orders.component';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';
import { OrderHistoryComponent } from './domains/order/pages/order-history.component';
import { RoleManagementComponent } from './domains/roleManagement/pages/role-management.component';
import { StaffDirectoryComponent } from './domains/staff/components/staff-directory/staff-directory.component';
import { AttendanceComponent } from './domains/staff/components/attendance/attendance.component';
import { LeaveManagementComponent } from './domains/staff/components/leave-management/leave-management.component';
import { PayrollComponent } from './domains/staff/components/payroll/payroll.component';
import { ShiftManagementComponent } from './domains/staff/components/shift-management/shift-management.component';
import { LoginComponent } from './core/component/login/login.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RestaurantSetupComponent } from './core/component/restaurant-setup/restaurant-setup.component';
import { PendingApprovalComponent } from './core/component/pending-approval/pending-approval.component';
import { SubscriptionComponent } from './core/component/subscription/subscription.component';

export const routes: Routes = [

  // ✅ MAIN LAYOUT (ADMIN PANEL)
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'onboarding/subscription', component: SubscriptionComponent },
      { path: 'onboarding/pending',      component: PendingApprovalComponent },
      { path: 'onboarding/setup',        component: RestaurantSetupComponent },
      { path: '',                     redirectTo: 'login', pathMatch: 'full' },

      // ✅ DASHBOARD
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },

      // ✅ INVENTORY MODULE
      {
        path: 'inventory',
        children: [
          { path: 'dashboard', component: DashboardComponent },
          { path: 'manage', component: ManageInventoryComponent },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ], canActivate: [AuthGuard]
      },

      // ✅ ORDERS MODULE
      {
        path: 'orders',
        children: [
          { path: 'live', component: LiveOrdersComponent },
          { path: 'history', component: OrderHistoryComponent }, 
          { path: '', redirectTo: 'live', pathMatch: 'full' }
        ], canActivate: [AuthGuard]
      },

      // ✅ POS MODULE (LAZY LOADED)
      {
        path: 'pos',
        loadChildren: () =>
          import('./domains/pos/pos.module').then(m => m.PosModule), canActivate: [AuthGuard]
      },

      // ✅ STAFF MODULE
      {
        path: 'staff',
        children: [
          { path: 'directory', component: StaffDirectoryComponent },
          { path: 'attendance', component: AttendanceComponent },
          { path: 'leave', component: LeaveManagementComponent },
          { path: 'salary', component: PayrollComponent },
          { path: 'shifts', component: ShiftManagementComponent },
          { path: 'roles', component: RoleManagementComponent },
          { path: '', redirectTo: 'directory', pathMatch: 'full' }
        ], canActivate: [AuthGuard]
      },


      // ✅ SYSTEM MODULE (future)
      // { path: 'settings', component: RoleManagementComponent },
      // { path: 'qr', loadComponent: () => import('./system/qr/qr.component').then(m => m.QrComponent) },
      // { path: 'settings', loadComponent: () => import('./system/settings/settings.component').then(m => m.SettingsComponent) },

      // ✅ DEFAULT
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // ✅ FALLBACK
  { path: '**', redirectTo: 'login' }
];
