import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TableService } from '../../services/table.service';
import { Reservation, WaitlistEntry, Table } from '../../models/table.model';
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component';

/* ── helpers ── */

export interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  reservations: Reservation[];
}

export interface TimeSlot {
  time: string;     // "19:00"
  label: string;    // "7:00 PM"
  count: number;    // reservations at this slot
  available: boolean;
}

interface PeakSlot { hour: string; count: number; pct: number; }

/* ── component ── */

@Component({
  selector: 'app-reservation-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './reservation-dashboard.component.html',
  styleUrls: ['./reservation-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReservationDashboardComponent implements OnInit, OnDestroy {

  /* ===== DATA ===== */
  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  waitlistEntries: WaitlistEntry[] = [];
  allTables: Table[] = [];

  /* ===== VIEW ===== */
  viewMode: 'calendar' | 'list' = 'list';
  activePanel: 'stats' | 'waitlist' = 'stats';

  /* ===== CALENDAR ===== */
  currentMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  selectedDate: string = new Date().toISOString().split('T')[0];
  readonly WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  /* ===== FILTERS ===== */
  filterStatus: string = 'all';
  filterDate: string   = '';
  searchQuery: string  = '';

  /* ===== STATS ===== */
  todayStats = { total: 0, confirmed: 0, pending: 0, arrived: 0, noShow: 0, cancelled: 0 };
  weekTotal: number    = 0;
  monthTotal: number   = 0;
  noShowRate: number   = 0;
  peakSlots: PeakSlot[] = [];

  /* ===== CREATE / EDIT MODAL ===== */
  showCreateModal   = false;
  editingReservation: Reservation | null = null;

  form = {
    customerName:    '',
    phoneNumber:     '',
    email:           '',
    guests:          2,
    date:            new Date().toISOString().split('T')[0],
    time:            '19:00',
    specialRequests: '',
    status:          'confirmed' as Reservation['status'],
    source:          'phone'     as Reservation['source'],
    sendSMS:         false,
    sendWhatsApp:    false
  };

  timeSlots: TimeSlot[]   = [];
  suggestedTable: Table | null = null;

  /* ===== WAITLIST FORM ===== */
  showWaitlistForm = false;
  wlForm = { customerName: '', phoneNumber: '', guests: 2 };

  /* ===== OVERBOOKING ===== */
  overbookingThreshold = 90; // % occupancy above which to warn

  private destroy$ = new Subject<void>();

  constructor(
    private tableService: TableService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}

  /* ===== LIFECYCLE ===== */

  ngOnInit(): void {
    this.tableService.getReservations()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.reservations = res;
        this.applyFilters();
        this.computeStats();
        this.buildCalendar();
        this.cdr.markForCheck();
      });

    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.allTables = tables;
        this.suggestTable();
        this.cdr.markForCheck();
      });

    this.tableService.getWaitlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe(entries => {
        this.waitlistEntries = entries.filter(e => e.status === 'waiting');
        this.cdr.markForCheck();
      });

    this.buildTimeSlots();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ===== FILTERS ===== */

  applyFilters(): void {
    let result = [...this.reservations];

    if (this.filterStatus !== 'all') {
      result = result.filter(r => r.status === this.filterStatus);
    }
    if (this.filterDate) {
      result = result.filter(r => r.date === this.filterDate);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r =>
        r.customerName.toLowerCase().includes(q) ||
        (r.phoneNumber || '').includes(q)
      );
    }

    // In list mode show all; in calendar mode show selected day
    if (this.viewMode === 'calendar') {
      result = result.filter(r => r.date === this.selectedDate);
    }

    this.filteredReservations = result.sort((a, b) => {
      const da = new Date(a.date + 'T' + a.time).getTime();
      const db = new Date(b.date + 'T' + b.time).getTime();
      return da - db;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.filterStatus = 'all';
    this.filterDate   = '';
    this.searchQuery  = '';
    this.applyFilters();
    this.cdr.markForCheck();
  }

  /* ===== STATS ===== */

  private computeStats(): void {
    const today = new Date().toISOString().split('T')[0];
    const todayRes = this.reservations.filter(r => r.date === today);

    this.todayStats = {
      total:     todayRes.length,
      confirmed: todayRes.filter(r => r.status === 'confirmed').length,
      pending:   todayRes.filter(r => r.status === 'pending').length,
      arrived:   todayRes.filter(r => r.status === 'arrived').length,
      noShow:    todayRes.filter(r => r.status === 'no-show').length,
      cancelled: todayRes.filter(r => r.status === 'cancelled').length
    };

    // Week total
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    this.weekTotal = this.reservations.filter(r => r.date >= weekAgo).length;

    // Month total
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const monthRes = this.reservations.filter(r => r.date >= monthAgo);
    this.monthTotal = monthRes.length;

    // No-show rate
    const completed = monthRes.filter(r =>
      r.status === 'arrived' || r.status === 'no-show' || r.status === 'cancelled'
    );
    this.noShowRate = completed.length
      ? Math.round((monthRes.filter(r => r.status === 'no-show').length / completed.length) * 100)
      : 0;

    // Peak slots
    const slotMap = new Map<string, number>();
    this.reservations.forEach(r => {
      const h = r.time.split(':')[0];
      slotMap.set(h, (slotMap.get(h) || 0) + 1);
    });
    const maxCount = Math.max(...slotMap.values(), 1);
    this.peakSlots = Array.from(slotMap.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([h, count]) => ({
        hour: this.formatHour(h),
        count,
        pct: Math.round((count / maxCount) * 100)
      }));
  }

  private formatHour(h: string): string {
    const n = Number(h);
    if (n === 0)  return '12 AM';
    if (n < 12)   return `${n} AM`;
    if (n === 12) return '12 PM';
    return `${n - 12} PM`;
  }

  /* ===== CALENDAR ===== */

  buildCalendar(): void {
    const year  = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month + 1, 0);
    const startPad  = firstDay.getDay();   // 0 = Sunday

    this.calendarDays = [];

    // Leading blanks from previous month
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      this.calendarDays.push(this.makeDay(d, false, today));
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      this.calendarDays.push(this.makeDay(new Date(year, month, d), true, today));
    }

    // Trailing blanks
    const trailing = 42 - this.calendarDays.length;
    for (let d = 1; d <= trailing; d++) {
      this.calendarDays.push(this.makeDay(new Date(year, month + 1, d), false, today));
    }
  }

  private makeDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
    const iso  = date.toISOString().split('T')[0];
    const dayRes = this.reservations.filter(r => r.date === iso);
    date.setHours(0, 0, 0, 0);
    return {
      date,
      dayNum: date.getDate(),
      isCurrentMonth,
      isToday: date.getTime() === today.getTime(),
      isSelected: iso === this.selectedDate,
      reservations: dayRes
    };
  }

  prevMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1, 1
    );
    this.buildCalendar();
    this.cdr.markForCheck();
  }

  nextMonth(): void {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1, 1
    );
    this.buildCalendar();
    this.cdr.markForCheck();
  }

  selectDay(day: CalendarDay): void {
    if (!day.isCurrentMonth) return;
    this.selectedDate = day.date.toISOString().split('T')[0];
    this.buildCalendar();
    this.applyFilters();
    this.cdr.markForCheck();
  }

  setViewMode(mode: 'calendar' | 'list'): void {
    this.viewMode = mode;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  get calendarMonthLabel(): string {
    return `${this.MONTHS[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  /* ===== TIME SLOTS ===== */

  buildTimeSlots(): void {
    const slots: TimeSlot[] = [];
    for (let h = 11; h <= 22; h++) {
      for (const m of ['00', '30']) {
        const time  = `${h.toString().padStart(2, '0')}:${m}`;
        const label = this.to12h(h, Number(m));
        const count = this.reservations.filter(r => r.time === time).length;
        slots.push({ time, label, count, available: count < 4 });
      }
    }
    this.timeSlots = slots;
  }

  private to12h(h: number, m: number): string {
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hh     = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${hh}:${m === 0 ? '00' : m} ${suffix}`;
  }

  selectTimeSlot(slot: TimeSlot): void {
    this.form.time = slot.time;
    this.suggestTable();
    this.cdr.markForCheck();
  }

  suggestTable(): void {
    this.suggestedTable = this.tableService.findSuitableTable(this.form.guests) || null;
  }

  /* ===== OVERBOOKING ===== */

  get isOverbooking(): boolean {
    const sameSlot = this.reservations.filter(
      r => r.date === this.form.date && r.time === this.form.time && r.status !== 'cancelled'
    ).length;
    return sameSlot >= Math.floor(this.allTables.length * (this.overbookingThreshold / 100));
  }

  /* ===== CREATE / EDIT MODAL ===== */

  openCreateModal(): void {
    this.editingReservation = null;
    this.form = {
      customerName: '', phoneNumber: '', email: '',
      guests: 2, date: new Date().toISOString().split('T')[0],
      time: '19:00', specialRequests: '',
      status: 'confirmed', source: 'phone',
      sendSMS: false, sendWhatsApp: false
    };
    this.buildTimeSlots();
    this.suggestTable();
    this.showCreateModal = true;
    this.cdr.markForCheck();
  }

  openEditModal(res: Reservation): void {
    this.editingReservation = res;
    this.form = {
      customerName:    res.customerName,
      phoneNumber:     res.phoneNumber || '',
      email:           res.email || '',
      guests:          res.guests,
      date:            res.date,
      time:            res.time,
      specialRequests: res.specialRequests || '',
      status:          res.status,
      source:          res.source || 'phone',
      sendSMS:         false,
      sendWhatsApp:    false
    };
    this.buildTimeSlots();
    this.suggestTable();
    this.showCreateModal = true;
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.editingReservation = null;
    this.cdr.markForCheck();
  }

  saveReservation(): void {
    if (!this.form.customerName.trim()) return;

    if (this.editingReservation) {
      this.tableService.updateReservation(this.editingReservation.id, {
        customerName:    this.form.customerName,
        phoneNumber:     this.form.phoneNumber,
        email:           this.form.email,
        guests:          this.form.guests,
        date:            this.form.date,
        time:            this.form.time,
        specialRequests: this.form.specialRequests,
        status:          this.form.status,
        source:          this.form.source
      });
    } else {
      const table = this.suggestedTable
        ?? this.tableService.findSuitableTable(this.form.guests)
        ?? this.allTables[0];

      this.tableService.addReservation({
        tableId:         table?.id ?? 1,
        tableNumber:     table?.number ?? 1,
        customerName:    this.form.customerName,
        phoneNumber:     this.form.phoneNumber,
        email:           this.form.email,
        guests:          this.form.guests,
        date:            this.form.date,
        time:            this.form.time,
        specialRequests: this.form.specialRequests,
        status:          this.form.status,
        source:          this.form.source,
        reminderSent:    false
      });
    }

    this.closeModal();
  }

  /* ===== QUICK ACTIONS ===== */

  confirmRes(res: Reservation): void {
    this.tableService.confirmReservation(res.id);
  }

  arrivedRes(res: Reservation): void {
    this.tableService.markReservationArrived(res.id);
  }

  noShowRes(res: Reservation): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Mark No-Show', message: `Mark "${res.customerName}" as no-show?`, confirmText: 'Yes, No-Show', cancelText: 'Cancel' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) this.tableService.markNoShow(res.id);
    });
  }

  cancelRes(res: Reservation): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancel Reservation', message: `Cancel reservation for "${res.customerName}"?`, confirmText: 'Yes, Cancel', cancelText: 'Keep' }
    });
    ref.afterClosed().subscribe(ok => {
      if (ok) this.tableService.cancelReservation(res.id);
    });
  }

  sendReminder(res: Reservation): void {
    this.tableService.updateReservation(res.id, { reminderSent: true });
  }

  /* ===== WAITLIST ===== */

  addToWaitlist(): void {
    if (!this.wlForm.customerName.trim()) return;
    const tableCount = this.allTables.filter(t => t.status === 'available').length;
    const estimatedWait = Math.max(5, 30 - tableCount * 5);
    this.tableService.addToWaitlist({
      customerName: this.wlForm.customerName,
      phoneNumber:  this.wlForm.phoneNumber,
      guests:       this.wlForm.guests,
      estimatedWait
    });
    this.wlForm = { customerName: '', phoneNumber: '', guests: 2 };
    this.showWaitlistForm = false;
    this.cdr.markForCheck();
  }

  seatWaitlist(entry: WaitlistEntry): void {
    this.tableService.seatWaitlistEntry(entry.id);
  }

  removeWaitlist(entry: WaitlistEntry): void {
    this.tableService.removeWaitlistEntry(entry.id);
  }

  /* ===== NAVIGATION ===== */

  goToTableDashboard(): void {
    this.router.navigate(['/tables']);
  }

  /* ===== HELPERS ===== */

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'status-confirmed',
      pending:   'status-pending',
      arrived:   'status-arrived',
      cancelled: 'status-cancelled',
      'no-show': 'status-noshow'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'Confirmed',
      pending:   'Pending',
      arrived:   'Arrived',
      cancelled: 'Cancelled',
      'no-show': 'No-Show'
    };
    return map[status] || status;
  }

  getSourceIcon(source?: string): string {
    const map: Record<string, string> = {
      phone:    '📞',
      online:   '🌐',
      whatsapp: '💬',
      'walk-in':'🚶'
    };
    return source ? (map[source] || '📋') : '📋';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    const tom   = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === tom)   return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  formatWaitTime(addedAt: Date | string): string {
    const diff = Math.floor((Date.now() - new Date(addedAt).getTime()) / 60000);
    return diff < 1 ? 'Just now' : `${diff}m ago`;
  }

  trackById(_: number, item: { id: number }): number { return item.id; }
  trackByDate(_: number, day: CalendarDay): number { return day.date.getTime(); }

  adjustGuests(delta: number): void {
    this.form.guests = Math.max(1, Math.min(20, this.form.guests + delta));
    this.suggestTable();
    this.cdr.markForCheck();
  }

  adjustWlGuests(delta: number): void {
    this.wlForm.guests = Math.max(1, Math.min(20, this.wlForm.guests + delta));
    this.cdr.markForCheck();
  }

  onDateOrTimeChange(): void {
    this.buildTimeSlots();
    this.suggestTable();
    this.cdr.markForCheck();
  }

  get activeFilterCount(): number {
    return (this.filterStatus !== 'all' ? 1 : 0) +
           (this.filterDate ? 1 : 0) +
           (this.searchQuery.trim() ? 1 : 0);
  }

  get calendarSelectedDateLabel(): string {
    return this.formatDate(this.selectedDate);
  }
}
