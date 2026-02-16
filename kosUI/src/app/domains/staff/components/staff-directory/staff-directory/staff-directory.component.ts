import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// Local view model for staff cards (structurally matches your StaffCard)
export type StaffStatus = 'BUSY' | 'NORMAL' | 'IDLE';
export type OnDutyStatus = 'ON DUTY' | 'OFF DUTY';
export type ViewMode = 'list' | 'grid';

export interface StaffDirectoryCard {
  id: string;
  name: string;
  role: string;
  load: number;
  efficiency: number;
  revenue: number;
  activeTables: number;
  rank: number;
  status: StaffStatus;
  onDutyStatus: OnDutyStatus;
  lastActive: Date;
  performance: number;
}

export interface StaffKpi {
  totalStaff: number;
  onDuty: number;
  busyStaff: number;
  idleStaff: number;
  avgEfficiency: number;
  totalRevenue: number;
  avgRevenue: number;
  totalActiveTables: number;
  awards: number;
}

// Matches the EmployeeModuleOverview object you created in the dashboard TS
export interface EmployeeModuleOverview {
  title: string;
  intro: string;
  keyFeaturesTitle: string;
  keyFeatures: { title: string; description: string }[];
  benefitsTitle: string;
  benefits: { title: string; description: string }[];
  summary: string;
}

@Component({
  selector: 'app-staff-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-directory.component.html',
  styleUrls: ['./staff-directory.component.css']
})
export class StaffDirectoryComponent {
  // ============= INPUTS FROM DASHBOARD (CONTAINER) =============

  @Input() overview!: EmployeeModuleOverview;
  @Input() kpi!: StaffKpi;
  @Input() staffCards: StaffDirectoryCard[] = [];

  @Input() viewMode: ViewMode = 'list';
  @Input() filterStatus: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE' = 'ALL';
  @Input() searchTerm = '';

  // ============= OUTPUTS TO DASHBOARD (CONTAINER) =============

  @Output() viewModeChange = new EventEmitter<ViewMode>();
  @Output() filterChange = new EventEmitter<'ALL' | 'BUSY' | 'NORMAL' | 'IDLE'>();
  @Output() searchChange = new EventEmitter<string>();

  @Output() addStaff = new EventEmitter<void>();
  @Output() viewStaff = new EventEmitter<StaffDirectoryCard>();
  @Output() editStaff = new EventEmitter<StaffDirectoryCard>();
  @Output() deleteStaff = new EventEmitter<string>();

  // ============= EVENT HANDLERS (CHILD -> PARENT) =============

  onViewModeChange(mode: ViewMode): void {
    if (this.viewMode !== mode) {
      this.viewModeChange.emit(mode);
    }
  }

  onFilterChange(status: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE'): void {
    this.filterChange.emit(status);
  }

  onSearchInput(value: string): void {
    this.searchChange.emit(value);
  }

  onAddStaffClicked(): void {
    this.addStaff.emit();
  }

  onViewStaffClicked(staff: StaffDirectoryCard, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.viewStaff.emit(staff);
  }

  onEditStaffClicked(staff: StaffDirectoryCard, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.editStaff.emit(staff);
  }

  onDeleteStaffClicked(staffId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.deleteStaff.emit(staffId);
  }

  // Row click handler (only view)
  onRowClick(staff: StaffDirectoryCard): void {
    this.viewStaff.emit(staff);
  }

  // ============= LOCAL UI HELPERS (PRESENTATIONAL ONLY) =============

  getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#fb923c';
    return '#ef4444';
  }

  getPerformanceStars(rating: number): string[] {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const stars: string[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalf) {
      stars.push('⯨');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }

    return stars;
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 60) {
      return `Today, ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackByStaffId(_: number, staff: StaffDirectoryCard): string {
    return staff.id;
  }
}
