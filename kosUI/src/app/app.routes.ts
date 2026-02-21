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
import { authGuard } from './core/guards/auth.guard';
import { RestaurantSetupComponent } from './core/component/restaurant-setup/restaurant-setup.component';
import { PendingApprovalComponent } from './core/component/pending-approval/pending-approval.component';
import { SubscriptionComponent } from './core/component/subscription/subscription.component';
import { AdminDashboardComponent } from '../Admin/pages/admin-dashboard/admin-dashboard.component';
import { UserTenantManagementComponent } from '../Admin/pages/user-tenant-management/user-tenant-management.component';
import { SubscriptionRevenueComponent } from '../Admin/pages/subscription-revenue/subscription-revenue.component';
import { RbacEngineComponent } from '../Admin/pages/rbac-engine/rbac-engine.component';
import { SecurityComplianceComponent } from '../Admin/pages/security-compliance/security-compliance.component';
import { NotificationsComponent } from '../Admin/pages/notification/notifications.component';
import { ProductFeatureComponent } from '../Admin/pages/product-feature/product-feature.component';
import { AiSmartControlComponent } from '../Admin/pages/AI-Smart-Control/ai-smart-control.component';
import { ConfigManagementComponent } from '../Admin/pages/configure-management/config-management.component';
import { SignupComponent } from './core/component/sign-up/signup.component';

export const routes: Routes = [

  // ✅ MAIN LAYOUT (ADMIN PANEL)
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'signup', component: SignupComponent },
      { path: 'onboarding/subscription', component: SubscriptionComponent },
      { path: 'onboarding/pending',      component: PendingApprovalComponent },
      { path: 'onboarding/setup',        component: RestaurantSetupComponent },
      { path: '',                     redirectTo: 'login', pathMatch: 'full' },

      { path: 'admin', component: AdminDashboardComponent},
      { path: 'admin/users', component: UserTenantManagementComponent},
      { path: 'admin/subscriptions', component: SubscriptionRevenueComponent},
      { path: 'admin/rbac', component: RbacEngineComponent},
      { path: 'admin/security', component: SecurityComplianceComponent},
      { path: 'admin/notifications', component: NotificationsComponent},
      { path: 'admin/products', component: ProductFeatureComponent},
      { path: 'admin/configuration', component: ConfigManagementComponent},
      { path: 'admin/ai-control', component: AiSmartControlComponent},

      
      // ✅ DASHBOARD
      { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },

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
          { path: 'history', component: OrderHistoryComponent }, 
          { path: '', redirectTo: 'live', pathMatch: 'full' }
        ]
      },

      // ✅ POS MODULE (LAZY LOADED)
      {
        path: 'pos',
        loadChildren: () =>
          import('./domains/pos/pos.module').then(m => m.PosModule)
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
        ]
      },


      // ✅ SYSTEM MODULE (future)
      // { path: 'settings', component: RoleManagementComponent },
      // { path: 'qr', loadComponent: () => import('./system/qr/qr.component').then(m => m.QrComponent) },
      // { path: 'settings', loadComponent: () => import('./system/settings/settings.component').then(m => m.SettingsComponent) },

      // ✅ DEFAULT
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // ✅ FALLBACK
  { path: '**', redirectTo: 'dashboard' }
];
