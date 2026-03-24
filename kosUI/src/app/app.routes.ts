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
import { WaiterComponent } from './domains/waiter/pages/waiter/waiter.component';
import { SalesReportComponent } from './domains/reports/pages/sales-report/sales-report.component';
import { InventoryReportComponent } from './domains/reports/pages/inventory-report/inventory-report.component';
import { CustomerReportComponent } from './domains/reports/pages/customer-report/customer-report.component';
import { StaffReportComponent } from './domains/reports/pages/staff-report/staff-report.component';
import { FinancialReportComponent } from './domains/reports/pages/financial-report/financial-report.component';
import { KitchenReportComponent } from './domains/reports/pages/kitchen-report/kitchen-report.component';
import { DeliveryReportComponent } from './domains/reports/pages/delivery-report/delivery-report.component';
import { BranchReportComponent } from './domains/reports/pages/branch-report/branch-report.component';

export const routes: Routes = [

  // ✅ MAIN LAYOUT (ADMIN PANEL)
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      { path: 'login',  title: 'Login | Kitchen Book',  component: LoginComponent },
      { path: 'signup', title: 'Sign Up | Kitchen Book', component: SignupComponent },
      { path: 'onboarding/subscription', title: 'Subscription | Kitchen Book', component: SubscriptionComponent },
      { path: 'onboarding/pending',      title: 'Pending Approval | Kitchen Book', component: PendingApprovalComponent },
      { path: 'onboarding/setup',        title: 'Restaurant Setup | Kitchen Book', component: RestaurantSetupComponent },
      { path: '',                     redirectTo: 'login', pathMatch: 'full' },

      { path: 'admin',                title: 'Admin Dashboard | Kitchen Book',  component: AdminDashboardComponent },
      { path: 'admin/users',          title: 'User Management | Kitchen Book',  component: UserTenantManagementComponent },
      { path: 'admin/subscriptions',  title: 'Subscriptions | Kitchen Book',    component: SubscriptionRevenueComponent },
      { path: 'admin/rbac',           title: 'RBAC Engine | Kitchen Book',      component: RbacEngineComponent },
      { path: 'admin/security',       title: 'Security | Kitchen Book',         component: SecurityComplianceComponent },
      { path: 'admin/notifications',  title: 'Notifications | Kitchen Book',    component: NotificationsComponent },
      { path: 'admin/products',       title: 'Products | Kitchen Book',         component: ProductFeatureComponent },
      { path: 'admin/configuration',  title: 'Configuration | Kitchen Book',    component: ConfigManagementComponent },
      { path: 'admin/ai-control',     title: 'AI Control | Kitchen Book',       component: AiSmartControlComponent },

      // ✅ DASHBOARD
      { path: 'dashboard', title: 'Dashboard | Kitchen Book', component: DashboardComponent, canActivate: [AuthGuard] },

      // ✅ INVENTORY MODULE
      {
        path: 'inventory',
        children: [
          { path: 'dashboard', title: 'Inventory Dashboard | Kitchen Book', component: DashboardComponent },
          { path: 'manage',    title: 'Manage Inventory | Kitchen Book',    component: ManageInventoryComponent },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ], canActivate: [AuthGuard]
      },

      // ✅ ORDERS MODULE
      {
        path: 'orders',
        children: [
          { path: 'live',    title: 'Live Orders | Kitchen Book',    component: LiveOrdersComponent },
          { path: 'history', title: 'Order History | Kitchen Book',  component: OrderHistoryComponent },
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
          { path: 'directory', title: 'Staff Directory | Kitchen Book',    component: StaffDirectoryComponent },
          { path: 'attendance', title: 'Attendance | Kitchen Book',        component: AttendanceComponent },
          { path: 'leave',     title: 'Leave Management | Kitchen Book',   component: LeaveManagementComponent },
          { path: 'salary',    title: 'Salary Management | Kitchen Book',  component: PayrollComponent },
          { path: 'shifts',    title: 'Shift Management | Kitchen Book',   component: ShiftManagementComponent },
          { path: 'roles',     title: 'Role Management | Kitchen Book',    component: RoleManagementComponent },
          { path: '', redirectTo: 'directory', pathMatch: 'full' }
        ], canActivate: [AuthGuard]
      },

      // ✅ WAITER MODULE
      { path: 'waiter', title: 'Waiter | Kitchen Book', component: WaiterComponent, canActivate: [AuthGuard] },

      // ✅ REPORTS MODULE
      {
        path: 'reports',
        children: [
          { path: 'sales',      title: 'Sales Report | Kitchen Book',            component: SalesReportComponent },
          { path: 'inventory',  title: 'Inventory Report | Kitchen Book',         component: InventoryReportComponent },
          { path: 'customer',   title: 'Customer Report | Kitchen Book',          component: CustomerReportComponent },
          { path: 'staff',      title: 'Staff Report | Kitchen Book',             component: StaffReportComponent },
          { path: 'financial',  title: 'Financial Report | Kitchen Book',         component: FinancialReportComponent },
          { path: 'kitchen',    title: 'Kitchen & Order Report | Kitchen Book',   component: KitchenReportComponent },
          { path: 'delivery',   title: 'Online & Delivery Report | Kitchen Book', component: DeliveryReportComponent },
          { path: 'branches',   title: 'Multiple Branch Report | Kitchen Book',   component: BranchReportComponent },
          { path: '', redirectTo: 'sales', pathMatch: 'full' }
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
