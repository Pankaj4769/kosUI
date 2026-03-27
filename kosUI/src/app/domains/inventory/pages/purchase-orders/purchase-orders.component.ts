import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface PurchaseOrder {
  poNo: string;
  supplier: string;
  date: string;
  items: number;
  total: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Delivered';
  requestedBy: string;
  priority: 'Normal' | 'High' | 'Urgent';
}

interface POItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface Invoice {
  invoiceNo: string;
  poNo: string;
  supplier: string;
  invoiceDate: string;
  amount: number;
  matched: boolean;
  status: string;
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseOrdersComponent {
  activeTab: 'po-list' | 'create-po' | 'approvals' | 'invoice-mapping' = 'po-list';
  showInfo = false;
  searchText = '';
  filterStatus = '';

  purchaseOrders: PurchaseOrder[] = [
    { poNo: 'PO-2026-001', supplier: 'Fresh Farms',   date: '2026-03-27', items: 8,  total: 12400, status: 'Delivered', requestedBy: 'Chef Ramesh',  priority: 'Normal' },
    { poNo: 'PO-2026-002', supplier: 'Dairy Direct',  date: '2026-03-26', items: 5,  total: 8750,  status: 'Approved',  requestedBy: 'Manager Priya', priority: 'Normal' },
    { poNo: 'PO-2026-003', supplier: 'Grain World',   date: '2026-03-25', items: 12, total: 22600, status: 'Pending',   requestedBy: 'Chef Ramesh',  priority: 'High' },
    { poNo: 'PO-2026-004', supplier: 'Meat Masters',  date: '2026-03-24', items: 4,  total: 18900, status: 'Pending',   requestedBy: 'Chef Arjun',   priority: 'Urgent' },
    { poNo: 'PO-2026-005', supplier: 'Spice Route',   date: '2026-03-23', items: 15, total: 5600,  status: 'Approved',  requestedBy: 'Manager Priya', priority: 'Normal' },
    { poNo: 'PO-2026-006', supplier: 'Veggie Fresh',  date: '2026-03-22', items: 10, total: 9800,  status: 'Rejected',  requestedBy: 'Chef Ramesh',  priority: 'Normal' },
    { poNo: 'PO-2026-007', supplier: 'Beverage Hub',  date: '2026-03-21', items: 6,  total: 14200, status: 'Draft',     requestedBy: 'Manager Priya', priority: 'Normal' },
    { poNo: 'PO-2026-008', supplier: 'Herb Garden',   date: '2026-03-20', items: 3,  total: 3400,  status: 'Pending',   requestedBy: 'Chef Arjun',   priority: 'High' }
  ];

  pendingApprovals: PurchaseOrder[] = [
    { poNo: 'PO-2026-003', supplier: 'Grain World',  date: '2026-03-25', items: 12, total: 22600, status: 'Pending', requestedBy: 'Chef Ramesh',  priority: 'High' },
    { poNo: 'PO-2026-004', supplier: 'Meat Masters', date: '2026-03-24', items: 4,  total: 18900, status: 'Pending', requestedBy: 'Chef Arjun',   priority: 'Urgent' },
    { poNo: 'PO-2026-008', supplier: 'Herb Garden',  date: '2026-03-20', items: 3,  total: 3400,  status: 'Pending', requestedBy: 'Chef Arjun',   priority: 'High' },
    { poNo: 'PO-2026-009', supplier: 'Fresh Farms',  date: '2026-03-26', items: 7,  total: 11200, status: 'Pending', requestedBy: 'Manager Priya', priority: 'Normal' },
    { poNo: 'PO-2026-010', supplier: 'Dairy Direct', date: '2026-03-27', items: 5,  total: 9800,  status: 'Pending', requestedBy: 'Chef Ramesh',  priority: 'Normal' }
  ];

  invoices: Invoice[] = [
    { invoiceNo: 'INV-2026-0445', poNo: 'PO-2026-001', supplier: 'Fresh Farms',  invoiceDate: '2026-03-27', amount: 12400, matched: true,  status: 'Matched' },
    { invoiceNo: 'INV-2026-0444', poNo: 'PO-2026-002', supplier: 'Dairy Direct', invoiceDate: '2026-03-26', amount: 8750,  matched: true,  status: 'Matched' },
    { invoiceNo: 'INV-2026-0443', poNo: 'PO-2026-005', supplier: 'Spice Route',  invoiceDate: '2026-03-23', amount: 5600,  matched: true,  status: 'Matched' },
    { invoiceNo: 'INV-2026-0442', poNo: '',             supplier: 'Meat Masters', invoiceDate: '2026-03-24', amount: 19200, matched: false, status: 'Unmatched' },
    { invoiceNo: 'INV-2026-0441', poNo: 'PO-2026-006', supplier: 'Veggie Fresh', invoiceDate: '2026-03-22', amount: 9800,  matched: true,  status: 'Matched' },
    { invoiceNo: 'INV-2026-0440', poNo: '',             supplier: 'Grain World',  invoiceDate: '2026-03-25', amount: 23100, matched: false, status: 'Unmatched' },
    { invoiceNo: 'INV-2026-0439', poNo: '',             supplier: 'Beverage Hub', invoiceDate: '2026-03-21', amount: 14200, matched: false, status: 'Pending Match' },
    { invoiceNo: 'INV-2026-0438', poNo: 'PO-2026-007', supplier: 'Fresh Farms',  invoiceDate: '2026-03-20', amount: 11500, matched: true,  status: 'Matched' }
  ];

  // Create PO form
  poForm = {
    supplier: '',
    deliveryDate: '',
    priority: 'Normal' as 'Normal' | 'High' | 'Urgent',
    notes: ''
  };

  poItems: POItem[] = [];

  currentItem: POItem = { name: '', quantity: 1, unit: 'kg', unitPrice: 0 };

  get poTotal(): number {
    return this.poItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  }

  get filteredPOs(): PurchaseOrder[] {
    return this.purchaseOrders.filter(p =>
      (p.poNo.toLowerCase().includes(this.searchText.toLowerCase()) ||
       p.supplier.toLowerCase().includes(this.searchText.toLowerCase())) &&
      (this.filterStatus === '' || p.status === this.filterStatus)
    );
  }

  addPOItem(): void {
    if (this.currentItem.name.trim()) {
      this.poItems.push({ ...this.currentItem });
      this.currentItem = { name: '', quantity: 1, unit: 'kg', unitPrice: 0 };
    }
  }

  removePOItem(i: number): void {
    this.poItems.splice(i, 1);
  }

  submitPO(): void {
    const newPO: PurchaseOrder = {
      poNo: `PO-2026-0${(this.purchaseOrders.length + 1).toString().padStart(2, '0')}`,
      supplier: this.poForm.supplier,
      date: new Date().toISOString().split('T')[0],
      items: this.poItems.length,
      total: this.poTotal,
      status: 'Pending',
      requestedBy: 'Current User',
      priority: this.poForm.priority
    };
    this.purchaseOrders.unshift(newPO);
    this.resetPOForm();
    this.activeTab = 'po-list';
  }

  saveDraft(): void {
    const newPO: PurchaseOrder = {
      poNo: `PO-2026-0${(this.purchaseOrders.length + 1).toString().padStart(2, '0')}`,
      supplier: this.poForm.supplier,
      date: new Date().toISOString().split('T')[0],
      items: this.poItems.length,
      total: this.poTotal,
      status: 'Draft',
      requestedBy: 'Current User',
      priority: this.poForm.priority
    };
    this.purchaseOrders.unshift(newPO);
    this.resetPOForm();
    this.activeTab = 'po-list';
  }

  private resetPOForm(): void {
    this.poForm = { supplier: '', deliveryDate: '', priority: 'Normal', notes: '' };
    this.poItems = [];
    this.currentItem = { name: '', quantity: 1, unit: 'kg', unitPrice: 0 };
  }

  approve(po: PurchaseOrder): void {
    po.status = 'Approved';
    const idx = this.pendingApprovals.indexOf(po);
    if (idx > -1) this.pendingApprovals.splice(idx, 1);
  }

  reject(po: PurchaseOrder): void {
    po.status = 'Rejected';
    const idx = this.pendingApprovals.indexOf(po);
    if (idx > -1) this.pendingApprovals.splice(idx, 1);
  }

  matchInvoice(inv: Invoice): void {
    inv.matched = true;
    inv.status = 'Matched';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      Draft: 'badge-amber', Pending: 'badge-amber', Approved: 'badge-green',
      Rejected: 'badge-red', Delivered: 'badge-blue'
    };
    return map[status] || 'badge-blue';
  }

  getPriorityBadge(priority: string): string {
    const map: Record<string, string> = { Normal: 'badge-blue', High: 'badge-red', Urgent: 'badge-red' };
    return map[priority] || 'badge-blue';
  }

  getInvoiceBadge(status: string): string {
    const map: Record<string, string> = { Matched: 'badge-green', Unmatched: 'badge-red', 'Pending Match': 'badge-amber' };
    return map[status] || 'badge-blue';
  }
}
