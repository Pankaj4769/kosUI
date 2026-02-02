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

  /* ================= OUTPUTS ================= */

  @Output() orderTypeChange = new EventEmitter<OrderType>();
  @Output() tableSelect = new EventEmitter<number>();
  @Output() customerInfoChange = new EventEmitter<CustomerInfo>();

  /* ================= STATE ================= */

  // Order Types
  orderTypes: OrderTypeOption[] = [
    { type: 'Dine-In', icon: 'restaurant', label: 'Dine-In' },
    { type: 'Takeaway', icon: 'shopping_bag', label: 'Takeaway' },
    { type: 'Delivery', icon: 'delivery_dining', label: 'Delivery' }
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

  // NEW: Table Selector Popup State
  showTableSelectorPopup = false;
  tempSelectedTable: Table | null = null;

  // NEW: UI Mode Toggle (set to true for new compact design)
  useCompactDesign = true;

  /* ================= CONSTRUCTOR ================= */

  constructor(private cdr: ChangeDetectorRef) {}

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
      { id: 1, number: 1, name: 'Table 1', status: 'available' as TableStatus, capacity: 4 },
      { 
        id: 2, 
        number: 2, 
        name: 'Table 2', 
        status: 'occupied' as TableStatus, 
        capacity: 2, 
        currentOrder: 'ORD-001', 
        waiter: 'John', 
        timeOccupied: new Date(now.getTime() - 30 * 60000),
        amount: 450,
        itemCount: 3,
        totalAmount: 450
      },
      { id: 3, number: 3, name: 'Table 3', status: 'available' as TableStatus, capacity: 4 },
      { id: 4, number: 4, name: 'Table 4', status: 'available' as TableStatus, capacity: 6 },
      { id: 5, number: 5, name: 'Table 5', status: 'available' as TableStatus, capacity: 4 },
      { 
        id: 6, 
        number: 6, 
        name: 'Table 6', 
        status: 'occupied' as TableStatus, 
        capacity: 2, 
        currentOrder: 'ORD-002', 
        waiter: 'Sarah', 
        timeOccupied: new Date(now.getTime() - 15 * 60000),
        amount: 280,
        itemCount: 2,
        totalAmount: 280
      },
      { id: 7, number: 7, name: 'Table 7', status: 'available' as TableStatus, capacity: 4 },
      { id: 8, number: 8, name: 'Table 8', status: 'cleaning' as TableStatus, capacity: 8 },
      { id: 9, number: 9, name: 'Table 9', status: 'available' as TableStatus, capacity: 2 },
      { id: 10, number: 10, name: 'Table 10', status: 'available' as TableStatus, capacity: 4 },
      { 
        id: 11, 
        number: 11, 
        name: 'Table 11', 
        status: 'occupied' as TableStatus, 
        capacity: 6, 
        currentOrder: 'ORD-003', 
        waiter: 'Mike', 
        timeOccupied: new Date(now.getTime() - 45 * 60000),
        amount: 720,
        itemCount: 5,
        totalAmount: 720
      },
      { id: 12, number: 12, name: 'Table 12', status: 'available' as TableStatus, capacity: 4 },
      { id: 13, number: 13, name: 'Table 13', status: 'available' as TableStatus, capacity: 6 },
      { id: 14, number: 14, name: 'Table 14', status: 'reserved' as TableStatus, capacity: 4 },
      { id: 15, number: 15, name: 'Table 15', status: 'available' as TableStatus, capacity: 4 },
      { id: 16, number: 16, name: 'Table 16', status: 'available' as TableStatus, capacity: 6 },
      { 
        id: 17, 
        number: 17, 
        name: 'Table 17', 
        status: 'occupied' as TableStatus, 
        capacity: 4, 
        currentOrder: 'ORD-004', 
        waiter: 'Emma', 
        timeOccupied: new Date(now.getTime() - 20 * 60000),
        amount: 340,
        itemCount: 4,
        totalAmount: 340
      },
      { id: 18, number: 18, name: 'Table 18', status: 'available' as TableStatus, capacity: 2 },
      { id: 19, number: 19, name: 'Table 19', status: 'available' as TableStatus, capacity: 4 },
      { id: 20, number: 20, name: 'Table 20', status: 'available' as TableStatus, capacity: 8 }
    ];
  }

  private initializeCustomerInfo(): void {
    if (this.customerInfo) {
      this.customerName = this.customerInfo.name;
      this.customerPhone = this.customerInfo.phone;
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
    this.orderType = type;
    this.orderTypeChange.emit(type);
    
    if (type === 'Dine-In') {
      this.showTableGrid = true;
      this.showCustomerForm = false;
    } else {
      this.showTableGrid = false;
      this.showCustomerForm = true;
    }
    
    this.cdr.markForCheck();
  }

  /* ================= TABLE SELECTION ================= */

  selectTable(tableNumber: number): void {
    const table = this.tables.find(t => t.number === tableNumber);
    
    if (table && table.status === 'available') {
      this.selectedTable = tableNumber;
      this.tableSelect.emit(tableNumber);
      this.cdr.markForCheck();
    } else if (table && table.status === 'occupied') {
      alert(`Table ${tableNumber} is currently occupied.`);
    } else if (table && table.status === 'reserved') {
      const confirm = window.confirm(`Table ${tableNumber} is reserved. Use anyway?`);
      if (confirm) {
        this.selectedTable = tableNumber;
        this.tableSelect.emit(tableNumber);
        this.cdr.markForCheck();
      }
    } else if (table && table.status === 'cleaning') {
      alert(`Table ${tableNumber} is being cleaned.`);
    }
  }

  clearTableSelection(): void {
    this.selectedTable = null;
    this.tableSelect.emit(0);
    this.cdr.markForCheck();
  }

  /* ================= NEW: TABLE SELECTOR POPUP METHODS ================= */

  openTableSelectorPopup(): void {
    this.showTableSelectorPopup = true;
    this.tempSelectedTable = this.getSelectedTableObject();
    
    // Reset filters for fresh view
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.sortBy = 'table';
    this.applyFilters();
    
    // Auto-focus search after popup opens
    setTimeout(() => {
      const searchInput = document.querySelector('.popup-search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }, 150);
    
    this.cdr.markForCheck();
  }

  closeTableSelectorPopup(): void {
    this.showTableSelectorPopup = false;
    this.tempSelectedTable = null;
    this.cdr.markForCheck();
  }

  selectTableInPopup(table: Table): void {
    // Don't allow selection of cleaning tables
    if (table.status === 'cleaning') {
      return;
    }
    
    this.tempSelectedTable = table;
    this.cdr.markForCheck();
  }

  confirmTableSelection(): void {
    if (!this.tempSelectedTable) return;
    
    const tableNumber = this.tempSelectedTable.number;
    const table = this.tempSelectedTable;
    
    // Check if table is available
    if (table.status === 'available') {
      this.selectedTable = tableNumber;
      this.tableSelect.emit(tableNumber);
      this.closeTableSelectorPopup();
    } 
    // Handle occupied table
    else if (table.status === 'occupied') {
      const confirm = window.confirm(
        `Table ${tableNumber} is currently occupied.\n` +
        `Waiter: ${table.waiter}\n` +
        `Items: ${table.itemCount}\n` +
        `Amount: ₹${table.totalAmount}\n\n` +
        `Do you want to view this order?`
      );
      
      if (confirm) {
        this.selectedTable = tableNumber;
        this.tableSelect.emit(tableNumber);
        this.closeTableSelectorPopup();
      }
    }
    // Handle reserved table
    else if (table.status === 'reserved') {
      const confirm = window.confirm(
        `Table ${tableNumber} is reserved.\n\n` +
        `Use this table anyway?`
      );
      
      if (confirm) {
        this.selectedTable = tableNumber;
        this.tableSelect.emit(tableNumber);
        this.closeTableSelectorPopup();
      }
    }
    
    this.cdr.markForCheck();
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
    
    // ESC to close
    if (event.key === 'Escape') {
      this.closeTableSelectorPopup();
      event.preventDefault();
    }
    
    // Enter to confirm selection
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

  onSortChange(sortBy: 'table' | 'items' | 'amount'): void {
    this.sortBy = sortBy;
    this.applySorting();
    this.cdr.markForCheck();
  }

  /* ================= TABLE DETAILS POP-UP ================= */

  openTableDetails(table: Table, event: Event): void {
    event.stopPropagation();
    this.selectedTableForDetails = table;
    this.showTableDetailsPopup = true;
    this.cdr.markForCheck();
  }

  closeTableDetails(): void {
    this.selectedTableForDetails = null;
    this.showTableDetailsPopup = false;
    this.cdr.markForCheck();
  }

  onSelectTableFromPopup(tableNumber: number): void {
    this.selectTable(tableNumber);
    this.closeTableDetails();
  }

  onCloseTableFromPopup(tableNumber: number): void {
    const table = this.tables.find(t => t.number === tableNumber);
    if (!table) return;

    const confirm = window.confirm(`Close Table ${tableNumber} and clear order?`);
    if (confirm) {
      table.status = 'available';
      table.currentOrder = undefined;
      table.waiter = undefined;
      table.timeOccupied = undefined;
      table.itemCount = undefined;
      table.totalAmount = undefined;
      table.amount = undefined;
      
      this.applyFilters();
      this.calculateTotalBill();
      this.closeTableDetails();
    }
  }

  onTransferTableFromPopup(tableNumber: number): void {
    alert('Transfer table feature coming soon');
  }

  /* ================= CUSTOMER INFO ================= */

  toggleCustomerForm(): void {
    this.showCustomerForm = !this.showCustomerForm;
    this.cdr.markForCheck();
  }

  saveCustomerInfo(): void {
    if (!this.customerName.trim() || !this.customerPhone.trim()) {
      alert('Please enter customer name and phone number.');
      return;
    }

    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(this.customerPhone)) {
      alert('Please enter a valid phone number.');
      return;
    }

    const info: CustomerInfo = {
      name: this.customerName.trim(),
      phone: this.customerPhone.trim(),
      address: this.customerAddress.trim() || undefined
    };

    this.customerInfo = info;
    this.customerInfoChange.emit(info);
    this.showCustomerForm = false;
    this.cdr.markForCheck();
  }

  clearCustomerInfo(): void {
    this.customerName = '';
    this.customerPhone = '';
    this.customerAddress = '';
    this.customerInfo = null;
    this.customerInfoChange.emit({ name: '', phone: '' });
    this.cdr.markForCheck();
  }

  /* ================= HELPERS ================= */

  getTableStatusClass(status: string): string {
    return `table-${status}`;
  }

  getTableStatusColor(status: string): string {
    switch (status) {
      case 'available': return '#4caf50';
      case 'occupied': return '#f44336';
      case 'reserved': return '#ff9800';
      case 'cleaning': return '#9e9e9e';
      default: return '#6b7280';
    }
  }

  getTableStatusIcon(status: string): string {
    switch (status) {
      case 'available': return '✓';
      case 'occupied': return '●';
      case 'reserved': return '◆';
      case 'cleaning': return '◯';
      default: return '?';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'available': return 'check_circle';
      case 'occupied': return 'restaurant';
      case 'reserved': return 'event';
      case 'cleaning': return 'cleaning_services';
      default: return 'help';
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
    
    const now = new Date();
    const diff = now.getTime() - table.timeOccupied.getTime();
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
      hour: '2-digit',
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
