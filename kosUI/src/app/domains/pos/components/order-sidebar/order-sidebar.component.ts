import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
// 🔴 CHANGE 8: Added MatDialog import — required for confirm dialogs
import { MatDialog } from '@angular/material/dialog';

// 🔴 CHANGE 8: Added ConfirmDialogComponent import — replaces all window.confirm/alert
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component';

// Models
import { Table, TableStatus } from '../../models/table.model';


/* ================= TYPES ================= */

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';

export interface OrderTypeOption {
  type: OrderType;
  icon: string;
  label: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
}


/* ================= COMPONENT ================= */

@Component({
  selector: 'app-order-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './order-sidebar.component.html',
  styleUrls: ['./order-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderSidebarComponent implements OnInit {


  /* ================= INPUTS ================= */

  @Input() orderType: OrderType = 'Dine-In';
  @Input() selectedTable: number | null = null;
  @Input() customerInfo: CustomerInfo | null = null;
  @Input() cartItemCount: number = 0;

  /* ================= OUTPUTS ================= */

  @Output() orderTypeChange = new EventEmitter<OrderType>();
  @Output() tableSelect = new EventEmitter<number>();
  @Output() customerInfoChange = new EventEmitter<CustomerInfo | null>();


  /* ================= STATE ================= */

  // Order Types
  orderTypes: OrderTypeOption[] = [
    { type: 'Dine-In',   icon: 'restaurant',      label: 'Dine-In'   },
    { type: 'Takeaway',  icon: 'shopping_bag',     label: 'Takeaway'  },
    { type: 'Delivery',  icon: 'delivery_dining',  label: 'Delivery'  }
  ];

  // Tables
  tables: Table[] = [];
  filteredTables: Table[] = [];

  // Search & Filters
  searchQuery = '';
  statusFilter: 'all' | 'available' | 'occupied' | 'reserved' = 'all';
  sortBy: 'table' | 'items' | 'amount' = 'table';

  // Customer Form
  customerName = '';
  customerPhone = '';
  customerAddress = '';

  // UI States
  showCustomerForm = false;
  showTableGrid = true;
  loading = false;
  error: string | null = null;

  // Statistics
  totalBill = 0;

  // Pop-up State (Existing)
  selectedTableForDetails: Table | null = null;
  showTableDetailsPopup = false;

  // 🆕 ADD to STATE section
  pendingOrderType: OrderType | null = null;
  showOrderTypeConfirmPopup = false;

  // NEW: Table Selector Popup State
  showTableSelectorPopup = false;
  tempSelectedTable: Table | null = null;

  // NEW: UI Mode Toggle (set to true for new compact design)
  useCompactDesign = true;

  // 🔴 CHANGE 1–5: Inline notification state — replaces alert() calls
  inlineError: string | null = null;
  inlineSuccess: string | null = null;


  /* ================= CONSTRUCTOR ================= */

  // 🔴 CHANGE 8: Added MatDialog to constructor
  constructor(
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}


  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.loadTables();
    this.initializeCustomerInfo();
  }


  /* ================= COMPUTED PROPERTIES ================= */

  get totalTables(): number {
    return this.tables.length;
  }

  get occupiedCount(): number {
    return this.tables.filter(t => t.status === 'occupied').length;
  }

  get availableCount(): number {
    return this.tables.filter(t => t.status === 'available').length;
  }

  get reservedTablesCount(): number {
    return this.tables.filter(t => t.status === 'reserved').length;
  }

  get occupancyRate(): number {
    if (this.totalTables === 0) return 0;
    return Math.round((this.occupiedCount / this.totalTables) * 100);
  }

  get availableTablesCount(): number {
    return this.availableCount;
  }


  /* ================= INITIALIZATION ================= */

  private loadTables(): void {
    this.loading = true;
    this.error = null;

    try {
      this.tables = this.getMockTables();
      this.applyFilters();
      this.calculateTotalBill();
    } catch (err) {
      this.error = 'Failed to load tables';
      console.error('Error loading tables:', err);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private getMockTables(): Table[] {
    const now = new Date();

    return [
      { id: 1,  number: 1,  name: 'Table 1',  status: 'available' as TableStatus, capacity: 4 },
      {
        id: 2, number: 2, name: 'Table 2', status: 'occupied' as TableStatus, capacity: 2,
        currentOrder: 'ORD-001', waiter: 'John',
        timeOccupied: new Date(now.getTime() - 30 * 60000),
        amount: 450, itemCount: 3, totalAmount: 450
      },
      { id: 3,  number: 3,  name: 'Table 3',  status: 'available' as TableStatus, capacity: 4 },
      { id: 4,  number: 4,  name: 'Table 4',  status: 'available' as TableStatus, capacity: 6 },
      { id: 5,  number: 5,  name: 'Table 5',  status: 'available' as TableStatus, capacity: 4 },
      {
        id: 6, number: 6, name: 'Table 6', status: 'occupied' as TableStatus, capacity: 2,
        currentOrder: 'ORD-002', waiter: 'Sarah',
        timeOccupied: new Date(now.getTime() - 15 * 60000),
        amount: 280, itemCount: 2, totalAmount: 280
      },
      { id: 7,  number: 7,  name: 'Table 7',  status: 'available'  as TableStatus, capacity: 4 },
      { id: 8,  number: 8,  name: 'Table 8',  status: 'cleaning'   as TableStatus, capacity: 8 },
      { id: 9,  number: 9,  name: 'Table 9',  status: 'available'  as TableStatus, capacity: 2 },
      { id: 10, number: 10, name: 'Table 10', status: 'available'  as TableStatus, capacity: 4 },
      {
        id: 11, number: 11, name: 'Table 11', status: 'occupied' as TableStatus, capacity: 6,
        currentOrder: 'ORD-003', waiter: 'Mike',
        timeOccupied: new Date(now.getTime() - 45 * 60000),
        amount: 720, itemCount: 5, totalAmount: 720
      },
      { id: 12, number: 12, name: 'Table 12', status: 'available' as TableStatus, capacity: 4 },
      { id: 13, number: 13, name: 'Table 13', status: 'available' as TableStatus, capacity: 6 },
      { id: 14, number: 14, name: 'Table 14', status: 'reserved'  as TableStatus, capacity: 4 },
      { id: 15, number: 15, name: 'Table 15', status: 'available' as TableStatus, capacity: 4 },
      { id: 16, number: 16, name: 'Table 16', status: 'available' as TableStatus, capacity: 6 },
      {
        id: 17, number: 17, name: 'Table 17', status: 'occupied' as TableStatus, capacity: 4,
        currentOrder: 'ORD-004', waiter: 'Emma',
        timeOccupied: new Date(now.getTime() - 20 * 60000),
        amount: 340, itemCount: 4, totalAmount: 340
      },
      { id: 18, number: 18, name: 'Table 18', status: 'available' as TableStatus, capacity: 2 },
      { id: 19, number: 19, name: 'Table 19', status: 'available' as TableStatus, capacity: 4 },
      { id: 20, number: 20, name: 'Table 20', status: 'available' as TableStatus, capacity: 8 }
    ];
  }

  private initializeCustomerInfo(): void {
    if (this.customerInfo) {
      this.customerName    = this.customerInfo.name;
      this.customerPhone   = this.customerInfo.phone;
      this.customerAddress = this.customerInfo.address || '';
    }
  }

  private calculateTotalBill(): void {
    this.totalBill = this.tables
      .filter(t => t.status === 'occupied')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  }


  /* ================= ORDER TYPE SELECTION ================= */

  selectOrderType(type: OrderType): void {
  this.pendingOrderType = type;
  this.showOrderTypeConfirmPopup = true;

  // Pre-fill form if customerInfo exists
  if (this.customerInfo) {
    this.customerName    = this.customerInfo.name;
    this.customerPhone   = this.customerInfo.phone;
    this.customerAddress = this.customerInfo.address || '';
  } else {
    this.customerName    = '';
    this.customerPhone   = '';
    this.customerAddress = '';
  }

  this.inlineError = null;
  this.cdr.markForCheck();
}

// 🆕 ADD: Confirm order type and save customer info
confirmOrderType(): void {
  if (!this.customerName.trim() || !this.customerPhone.trim()) {
    this.inlineError = 'Please enter customer name and phone number.';
    this.cdr.markForCheck();
    return;
  }

  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  if (!phoneRegex.test(this.customerPhone)) {
    this.inlineError = 'Please enter a valid phone number.';
    this.cdr.markForCheck();
    return;
  }

  this.inlineError = null;

  // Apply the order type
  this.orderType = this.pendingOrderType!;
  this.orderTypeChange.emit(this.orderType);

  // Save customer info
  const info: CustomerInfo = {
    name:    this.customerName.trim(),
    phone:   this.customerPhone.trim(),
    address: this.customerAddress.trim() || undefined
  };

  this.customerInfo = info;
  this.customerInfoChange.emit(info);

  // UI state
  if (this.orderType === 'Dine-In') {
    this.showTableGrid    = true;
    this.showCustomerForm = false;
  } else {
    this.showTableGrid    = false;
    this.showCustomerForm = true;
  }

  this.showOrderTypeConfirmPopup = false;
  this.pendingOrderType          = null;
  this.cdr.markForCheck();
}

// 🆕 ADD: Cancel order type change
cancelOrderTypeChange(): void {
  this.showOrderTypeConfirmPopup = false;
  this.pendingOrderType          = null;
  this.inlineError               = null;
  this.cdr.markForCheck();
}


  /* ================= TABLE SELECTION ================= */

  selectTable(tableNumber: number): void {
    const table = this.tables.find(t => t.number === tableNumber);
    if (!table) return;

    if (table.status === 'available') {
      this.selectedTable = tableNumber;
      this.tableSelect.emit(tableNumber);
      this.cdr.markForCheck();

    } else if (table.status === 'occupied') {
      // 🔴 CHANGE 1: Replaced alert() with MatDialog
      this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Table Occupied',
          message: `Table ${tableNumber} is currently occupied. You cannot select it right now.`,
          confirmText: 'OK',
          confirmColor: 'warn',
          hideCancelButton: true
        }
      });

    } else if (table.status === 'reserved') {
      // 🔴 CHANGE 1: Replaced window.confirm() with MatDialog
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Table Reserved',
          message: `Table ${tableNumber} is reserved. Use this table anyway?`,
          confirmText: 'Yes, Use It',
          confirmColor: 'primary'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) {
          this.selectedTable = tableNumber;
          this.tableSelect.emit(tableNumber);
          this.cdr.markForCheck();
        }
      });

    } else if (table.status === 'cleaning') {
      // 🔴 CHANGE 1: Replaced alert() with MatDialog
      this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Table Being Cleaned',
          message: `Table ${tableNumber} is currently being cleaned. Please wait.`,
          confirmText: 'OK',
          confirmColor: 'primary',
          hideCancelButton: true
        }
      });
    }
  }

  clearTableSelection(): void {
    this.selectedTable = null;
    this.tableSelect.emit(0);
    this.cdr.markForCheck();
  }


  /* ================= TABLE SELECTOR POPUP ================= */

  openTableSelectorPopup(): void {
    this.showTableSelectorPopup = true;
    this.tempSelectedTable = this.getSelectedTableObject();

    this.searchQuery  = '';
    this.statusFilter = 'all';
    this.sortBy       = 'table';
    this.applyFilters();

    setTimeout(() => {
      const searchInput = document.querySelector('.popup-search-input') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    }, 150);

    this.cdr.markForCheck();
  }

  closeTableSelectorPopup(): void {
    this.showTableSelectorPopup = false;
    this.tempSelectedTable = null;
    this.cdr.markForCheck();
  }

  selectTableInPopup(table: Table): void {
    if (table.status === 'cleaning') return;
    this.tempSelectedTable = table;
    this.cdr.markForCheck();
  }

  confirmTableSelection(): void {
    if (!this.tempSelectedTable) return;

    const tableNumber = this.tempSelectedTable.number;
    const table       = this.tempSelectedTable;

    if (table.status === 'available') {
      this.selectedTable = tableNumber;
      this.tableSelect.emit(tableNumber);
      this.closeTableSelectorPopup();

    } else if (table.status === 'occupied') {
      // 🔴 CHANGE 2: Replaced window.confirm() with MatDialog
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '420px',
        data: {
          title: `Table ${tableNumber} is Occupied`,
          message:
            `Waiter: ${table.waiter || 'N/A'}\n` +
            `Items: ${table.itemCount ?? 0}\n` +
            `Amount: ₹${table.totalAmount ?? 0}\n\n` +
            `Do you want to view this order?`,
          confirmText: 'View Order',
          confirmColor: 'primary'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) {
          this.selectedTable = tableNumber;
          this.tableSelect.emit(tableNumber);
          this.closeTableSelectorPopup();
        }
        this.cdr.markForCheck();
      });

    } else if (table.status === 'reserved') {
      // 🔴 CHANGE 2: Replaced window.confirm() with MatDialog
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: `Table ${tableNumber} is Reserved`,
          message: `This table is reserved. Use it anyway?`,
          confirmText: 'Yes, Use It',
          confirmColor: 'warn'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) {
          this.selectedTable = tableNumber;
          this.tableSelect.emit(tableNumber);
          this.closeTableSelectorPopup();
        }
        this.cdr.markForCheck();
      });
    }
  }

  getSelectedTableObject(): Table | null {
    if (!this.selectedTable) return null;
    return this.tables.find(t => t.number === this.selectedTable) || null;
  }

  getAvailableCountInPopup(): number {
    return this.filteredTables.filter(t => t.status === 'available').length;
  }

  handlePopupKeyboard(event: KeyboardEvent): void {
    if (!this.showTableSelectorPopup) return;

    if (event.key === 'Escape') {
      this.closeTableSelectorPopup();
      event.preventDefault();
    }

    if (event.key === 'Enter' && this.tempSelectedTable) {
      this.confirmTableSelection();
      event.preventDefault();
    }
  }


  /* ================= TABLE FILTERING ================= */

  applyFilters(): void {
    let filtered = [...this.tables];

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(table => table.status === this.statusFilter);
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(table =>
        table.number.toString().includes(query) ||
        table.name.toLowerCase().includes(query) ||
        table.capacity.toString().includes(query) ||
        table.status.toLowerCase().includes(query) ||
        table.waiter?.toLowerCase().includes(query)
      );
    }

    this.applySorting(filtered);
    this.filteredTables = filtered;
    this.cdr.markForCheck();
  }

  private applySorting(tables?: Table[]): void {
    const tablesToSort = tables || this.filteredTables;

    switch (this.sortBy) {
      case 'table':
        tablesToSort.sort((a, b) => a.number - b.number);
        break;
      case 'items':
        tablesToSort.sort((a, b) => (b.itemCount ?? 0) - (a.itemCount ?? 0));
        break;
      case 'amount':
        tablesToSort.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0));
        break;
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  selectStatusFilter(status: 'all' | 'available' | 'occupied' | 'reserved'): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  // 🟠 CHANGE 7: Fixed — now calls applyFilters() instead of applySorting()
  // so filteredTables is always sorted on the live array, not a stale copy
  onSortChange(sortBy: 'table' | 'items' | 'amount'): void {
    this.sortBy = sortBy;
    this.applyFilters();
    this.cdr.markForCheck();
  }


  /* ================= TABLE DETAILS POP-UP ================= */

  openTableDetails(table: Table, event: Event): void {
    event.stopPropagation();
    this.selectedTableForDetails = table;
    this.showTableDetailsPopup   = true;
    this.cdr.markForCheck();
  }

  closeTableDetails(): void {
    this.selectedTableForDetails = null;
    this.showTableDetailsPopup   = false;
    this.cdr.markForCheck();
  }

  onSelectTableFromPopup(tableNumber: number): void {
    this.selectTable(tableNumber);
    this.closeTableDetails();
  }

  onCloseTableFromPopup(tableNumber: number): void {
    const table = this.tables.find(t => t.number === tableNumber);
    if (!table) return;

    // 🔴 CHANGE 3: Replaced window.confirm() with MatDialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Close Table?',
        message: `Close Table ${tableNumber} and clear its current order? This cannot be undone.`,
        confirmText: 'Yes, Close',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        table.status       = 'available';
        table.currentOrder = undefined;
        table.waiter       = undefined;
        table.timeOccupied = undefined;
        table.itemCount    = undefined;
        table.totalAmount  = undefined;
        table.amount       = undefined;

        this.applyFilters();
        this.calculateTotalBill();
        this.closeTableDetails();
        this.cdr.markForCheck();
      }
    });
  }

  onTransferTableFromPopup(tableNumber: number): void {
    // 🔴 CHANGE 4: Replaced alert() with MatDialog info dialog
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Feature Coming Soon',
        message: 'Table transfer feature is not yet available. Please contact the manager.',
        confirmText: 'OK',
        confirmColor: 'primary',
        hideCancelButton: true
      }
    });
  }


  /* ================= CUSTOMER INFO ================= */

  toggleCustomerForm(): void {
    this.showCustomerForm = !this.showCustomerForm;
    this.cdr.markForCheck();
  }

  saveCustomerInfo(): void {
    // 🔴 CHANGE 5: Replaced alert() with inline error state
    if (!this.customerName.trim() || !this.customerPhone.trim()) {
      this.inlineError = 'Please enter customer name and phone number.';
      this.cdr.markForCheck();
      return;
    }

    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(this.customerPhone)) {
      this.inlineError = 'Please enter a valid phone number.';
      this.cdr.markForCheck();
      return;
    }

    // Clear any previous inline error
    this.inlineError = null;

    const info: CustomerInfo = {
      name:    this.customerName.trim(),
      phone:   this.customerPhone.trim(),
      address: this.customerAddress.trim() || undefined
    };

    this.customerInfo     = info;
    this.showCustomerForm = false;
    this.customerInfoChange.emit(info);
    this.cdr.markForCheck();
  }

  // 🟠 CHANGE 6: Emits null instead of empty object — signals properly cleared state
  clearCustomerInfo(): void {
    this.customerName    = '';
    this.customerPhone   = '';
    this.customerAddress = '';
    this.customerInfo    = null;
    this.inlineError     = null;
    this.customerInfoChange.emit(null);
    this.cdr.markForCheck();
  }


  /* ================= HELPERS ================= */

  getTableStatusClass(status: string): string {
    return `table-${status}`;
  }

  getTableStatusColor(status: string): string {
    switch (status) {
      case 'available': return '#4caf50';
      case 'occupied':  return '#f44336';
      case 'reserved':  return '#ff9800';
      case 'cleaning':  return '#9e9e9e';
      default:          return '#6b7280';
    }
  }

  getTableStatusIcon(status: string): string {
    switch (status) {
      case 'available': return '✓';
      case 'occupied':  return '●';
      case 'reserved':  return '◆';
      case 'cleaning':  return '◯';
      default:          return '?';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'available': return 'check_circle';
      case 'occupied':  return 'restaurant';
      case 'reserved':  return 'event';
      case 'cleaning':  return 'cleaning_services';
      default:          return 'help';
    }
  }

  getTableSummary(table: Table): string {
    let summary = `${table.name} - ${table.capacity} seats`;

    if (table.status === 'occupied' && table.waiter) {
      summary += `\nWaiter: ${table.waiter}`;
    }

    if (table.status === 'occupied' && table.timeOccupied) {
      summary += `\nTime: ${this.getTimeOccupied(table)}`;
    }

    return summary;
  }

  getTimeOccupied(table: Table): string {
    if (!table.timeOccupied) return '';

    const now     = new Date();
    const diff    = now.getTime() - table.timeOccupied.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
  }

  getFormattedTime(date: Date | undefined): string {
    if (!date) return '';

    return new Date(date).toLocaleTimeString('en-IN', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  isTableSelected(tableNumber: number): boolean {
    return this.selectedTable === tableNumber;
  }

  trackByTableId(index: number, table: Table): number {
    return table.id;
  }


  /* ================= REFRESH ================= */

  refreshTables(): void {
    this.loadTables();
  }

  refreshData(): void {
    this.refreshTables();
  }
}
