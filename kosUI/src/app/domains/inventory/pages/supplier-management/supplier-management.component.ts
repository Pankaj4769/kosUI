import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  category: string;
  orders: number;
  rating: number;
  status: 'Active' | 'Inactive' | 'Pending';
  address: string;
  paymentTerms: string;
  creditLimit: number;
}

interface PerformanceRow {
  supplier: string;
  orders: number;
  onTime: number;
  quality: number;
  avgDays: number;
  score: number;
  pct: number;
}

interface Transaction {
  date: string;
  supplier: string;
  invoiceNo: string;
  items: number;
  amount: number;
  status: string;
  payment: string;
}

@Component({
  selector: 'app-supplier-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './supplier-management.component.html',
  styleUrls: ['./supplier-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupplierManagementComponent {
  activeTab: 'list' | 'add-edit' | 'performance' | 'transactions' = 'list';
  showInfo = false;
  searchText = '';
  filterStatus = '';
  activeDateRange = 'Week';
  dateRanges = ['Today', 'Week', 'Month', 'Year'];

  suppliers: Supplier[] = [
    { id: 1, name: 'Fresh Farms', contact: 'Rajan Kumar', email: 'rajan@freshfarms.in', phone: '9876543210', category: 'Vegetables', orders: 48, rating: 4.5, status: 'Active', address: '12 Green Lane, Mumbai', paymentTerms: 'Net 30', creditLimit: 50000 },
    { id: 2, name: 'Spice Route', contact: 'Meena Pillai', email: 'meena@spiceroute.in', phone: '9765432109', category: 'Spices', orders: 32, rating: 4.2, status: 'Active', address: '45 Spice Market, Chennai', paymentTerms: 'Net 60', creditLimit: 30000 },
    { id: 3, name: 'Dairy Direct', contact: 'Suresh Patel', email: 'suresh@dairydirect.in', phone: '9654321098', category: 'Dairy', orders: 60, rating: 4.7, status: 'Active', address: '7 Milk Colony, Ahmedabad', paymentTerms: 'Immediate', creditLimit: 40000 },
    { id: 4, name: 'Meat Masters', contact: 'Farhan Sheikh', email: 'farhan@meatmasters.in', phone: '9543210987', category: 'Meat', orders: 25, rating: 4.0, status: 'Active', address: '3 Cold Storage Road, Hyderabad', paymentTerms: 'Net 30', creditLimit: 60000 },
    { id: 5, name: 'Grain World', contact: 'Lakshmi Rao', email: 'lakshmi@grainworld.in', phone: '9432109876', category: 'Grains', orders: 55, rating: 4.3, status: 'Active', address: '22 Warehouse District, Pune', paymentTerms: 'Net 60', creditLimit: 80000 },
    { id: 6, name: 'Beverage Hub', contact: 'Amit Sharma', email: 'amit@beveragehub.in', phone: '9321098765', category: 'Beverages', orders: 18, rating: 3.8, status: 'Pending', address: '9 Drink Factory, Delhi', paymentTerms: 'Immediate', creditLimit: 20000 },
    { id: 7, name: 'Veggie Fresh', contact: 'Priya Nair', email: 'priya@veggiefresh.in', phone: '9210987654', category: 'Vegetables', orders: 42, rating: 4.6, status: 'Active', address: '15 Farm Gate, Bangalore', paymentTerms: 'Net 30', creditLimit: 45000 },
    { id: 8, name: 'Herb Garden', contact: 'Deepak Joshi', email: 'deepak@herbgarden.in', phone: '9109876543', category: 'Spices', orders: 12, rating: 3.5, status: 'Inactive', address: '4 Herbal Park, Jaipur', paymentTerms: 'Net 30', creditLimit: 15000 }
  ];

  performanceRows: PerformanceRow[] = [
    { supplier: 'Fresh Farms',   orders: 48, onTime: 46, quality: 4.5, avgDays: 1.8, score: 95, pct: 95 },
    { supplier: 'Spice Route',   orders: 32, onTime: 30, quality: 4.2, avgDays: 2.1, score: 90, pct: 90 },
    { supplier: 'Dairy Direct',  orders: 60, onTime: 58, quality: 4.7, avgDays: 1.2, score: 97, pct: 97 },
    { supplier: 'Meat Masters',  orders: 25, onTime: 22, quality: 4.0, avgDays: 2.5, score: 85, pct: 85 },
    { supplier: 'Grain World',   orders: 55, onTime: 51, quality: 4.3, avgDays: 2.0, score: 92, pct: 92 },
    { supplier: 'Beverage Hub',  orders: 18, onTime: 15, quality: 3.8, avgDays: 3.2, score: 78, pct: 78 },
    { supplier: 'Veggie Fresh',  orders: 42, onTime: 40, quality: 4.6, avgDays: 1.5, score: 96, pct: 96 },
    { supplier: 'Herb Garden',   orders: 12, onTime: 10, quality: 3.5, avgDays: 3.8, score: 72, pct: 72 }
  ];

  transactions: Transaction[] = [
    { date: '2026-03-27', supplier: 'Fresh Farms',  invoiceNo: 'INV-2026-0445', items: 8,  amount: 12400, status: 'Paid',    payment: 'Bank Transfer' },
    { date: '2026-03-26', supplier: 'Dairy Direct', invoiceNo: 'INV-2026-0444', items: 5,  amount: 8750,  status: 'Pending', payment: 'Cheque' },
    { date: '2026-03-25', supplier: 'Grain World',  invoiceNo: 'INV-2026-0443', items: 12, amount: 22600, status: 'Paid',    payment: 'Bank Transfer' },
    { date: '2026-03-24', supplier: 'Meat Masters', invoiceNo: 'INV-2026-0442', items: 4,  amount: 18900, status: 'Overdue', payment: 'Cheque' },
    { date: '2026-03-23', supplier: 'Spice Route',  invoiceNo: 'INV-2026-0441', items: 15, amount: 5600,  status: 'Paid',    payment: 'UPI' },
    { date: '2026-03-22', supplier: 'Veggie Fresh', invoiceNo: 'INV-2026-0440', items: 10, amount: 9800,  status: 'Paid',    payment: 'Bank Transfer' },
    { date: '2026-03-21', supplier: 'Beverage Hub', invoiceNo: 'INV-2026-0439', items: 6,  amount: 14200, status: 'Pending', payment: 'Cheque' },
    { date: '2026-03-20', supplier: 'Fresh Farms',  invoiceNo: 'INV-2026-0438', items: 9,  amount: 11500, status: 'Paid',    payment: 'UPI' },
    { date: '2026-03-19', supplier: 'Herb Garden',  invoiceNo: 'INV-2026-0437', items: 3,  amount: 3400,  status: 'Overdue', payment: 'Cheque' },
    { date: '2026-03-18', supplier: 'Dairy Direct', invoiceNo: 'INV-2026-0436', items: 7,  amount: 9100,  status: 'Paid',    payment: 'Bank Transfer' }
  ];

  selectedSupplier: Supplier | null = null;

  supplierForm = {
    name: '',
    contact: '',
    email: '',
    phone: '',
    category: '',
    address: '',
    paymentTerms: '',
    creditLimit: 0
  };

  get filteredSuppliers(): Supplier[] {
    return this.suppliers.filter(s =>
      (s.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
       s.contact.toLowerCase().includes(this.searchText.toLowerCase())) &&
      (this.filterStatus === '' || s.status === this.filterStatus)
    );
  }

  editSupplier(s: Supplier): void {
    this.selectedSupplier = s;
    this.supplierForm = {
      name: s.name, contact: s.contact, email: s.email, phone: s.phone,
      category: s.category, address: s.address, paymentTerms: s.paymentTerms, creditLimit: s.creditLimit
    };
    this.activeTab = 'add-edit';
  }

  saveSupplier(): void {
    if (this.selectedSupplier) {
      Object.assign(this.selectedSupplier, this.supplierForm);
    } else {
      this.suppliers.push({
        id: this.suppliers.length + 1,
        name: this.supplierForm.name,
        contact: this.supplierForm.contact,
        email: this.supplierForm.email,
        phone: this.supplierForm.phone,
        category: this.supplierForm.category,
        orders: 0,
        rating: 0,
        status: 'Pending',
        address: this.supplierForm.address,
        paymentTerms: this.supplierForm.paymentTerms,
        creditLimit: this.supplierForm.creditLimit
      });
    }
    this.resetForm();
    this.activeTab = 'list';
  }

  cancelForm(): void {
    this.resetForm();
    this.activeTab = 'list';
  }

  private resetForm(): void {
    this.selectedSupplier = null;
    this.supplierForm = { name: '', contact: '', email: '', phone: '', category: '', address: '', paymentTerms: '', creditLimit: 0 };
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = { Active: 'badge-green', Inactive: 'badge-red', Pending: 'badge-amber' };
    return map[status] || 'badge-blue';
  }

  getTxBadge(status: string): string {
    const map: Record<string, string> = { Paid: 'badge-green', Pending: 'badge-amber', Overdue: 'badge-red' };
    return map[status] || 'badge-blue';
  }

  getBarColor(pct: number): string {
    if (pct >= 90) return '#16a34a';
    if (pct >= 75) return '#d97706';
    return '#dc2626';
  }
}
