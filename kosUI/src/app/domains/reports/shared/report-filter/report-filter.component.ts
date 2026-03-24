import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface FilterConfig {
  showBranch?: boolean;
  showCategory?: boolean;
  showStaff?: boolean;
  showStatus?: boolean;
  showPayment?: boolean;
}

export interface ActiveFilters {
  startDate: string;
  endDate: string;
  branch: string;
  category: string;
  staff: string;
  status: string;
  payment: string;
}

@Component({
  selector: 'app-report-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './report-filter.component.html',
  styleUrls: ['./report-filter.component.css']
})
export class ReportFilterComponent {
  @Input() filters: FilterConfig = {};
  @Output() filterChange = new EventEmitter<ActiveFilters>();

  isOpen = false;

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    if (!this.el.nativeElement.contains(e.target)) this.isOpen = false;
  }
  startDate = '';
  endDate = '';
  selectedBranch = 'All';
  selectedCategory = 'All';
  selectedStaff = 'All';
  selectedStatus = 'All';
  selectedPayment = 'All';

  branches = ['All', 'Main Branch', 'City Center', 'Mall Outlet', 'Airport'];
  categories = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Dinner', 'Beverages'];
  staffList = ['All', 'Ravi Kumar', 'Priya Sharma', 'Amit Singh', 'Neha Patel'];
  statuses = ['All', 'PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
  payments = ['All', 'Cash', 'Card', 'UPI', 'Wallet'];

  get activeCount(): number {
    let count = 0;
    if (this.selectedBranch !== 'All') count++;
    if (this.selectedCategory !== 'All') count++;
    if (this.selectedStaff !== 'All') count++;
    if (this.selectedStatus !== 'All') count++;
    if (this.selectedPayment !== 'All') count++;
    if (this.startDate) count++;
    return count;
  }

  toggle() {
    this.isOpen = !this.isOpen;
  }

  apply() {
    this.filterChange.emit({
      startDate: this.startDate,
      endDate: this.endDate,
      branch: this.selectedBranch,
      category: this.selectedCategory,
      staff: this.selectedStaff,
      status: this.selectedStatus,
      payment: this.selectedPayment
    });
    this.isOpen = false;
  }

  reset() {
    this.startDate = '';
    this.endDate = '';
    this.selectedBranch = 'All';
    this.selectedCategory = 'All';
    this.selectedStaff = 'All';
    this.selectedStatus = 'All';
    this.selectedPayment = 'All';
    this.filterChange.emit({
      startDate: '', endDate: '',
      branch: 'All', category: 'All',
      staff: 'All', status: 'All', payment: 'All'
    });
    this.isOpen = false;
  }
}
