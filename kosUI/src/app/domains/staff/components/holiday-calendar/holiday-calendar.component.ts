import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Holiday {
  id: number;
  name: string;
  date: string;
  type: 'PUBLIC' | 'COMPANY' | 'OPTIONAL';
  description?: string;
}

@Component({
  selector: 'app-holiday-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './holiday-calendar.component.html',
  styleUrls: ['./holiday-calendar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HolidayCalendarComponent implements OnInit {

  year = new Date().getFullYear();
  holidays: Holiday[] = [];
  showModal  = false;
  editTarget: Holiday | null = null;
  deleteTarget: Holiday | null = null;

  form: Omit<Holiday, 'id'> = { name: '', date: '', type: 'PUBLIC', description: '' };

  private nextId = 1;

  ngOnInit(): void {
    // Seed with common Indian public holidays for current year
    const y = this.year;
    const defaults: Omit<Holiday, 'id'>[] = [
      { name: "New Year's Day",      date: `${y}-01-01`, type: 'PUBLIC' },
      { name: 'Republic Day',        date: `${y}-01-26`, type: 'PUBLIC' },
      { name: 'Holi',                date: `${y}-03-17`, type: 'PUBLIC' },
      { name: 'Good Friday',         date: `${y}-04-18`, type: 'PUBLIC' },
      { name: 'Eid ul-Fitr',         date: `${y}-03-31`, type: 'PUBLIC' },
      { name: 'Independence Day',    date: `${y}-08-15`, type: 'PUBLIC' },
      { name: 'Gandhi Jayanti',      date: `${y}-10-02`, type: 'PUBLIC' },
      { name: 'Dussehra',            date: `${y}-10-02`, type: 'PUBLIC' },
      { name: 'Diwali',              date: `${y}-10-20`, type: 'PUBLIC' },
      { name: 'Christmas',           date: `${y}-12-25`, type: 'PUBLIC' },
    ];
    this.holidays = defaults.map(h => ({ ...h, id: this.nextId++ }));
    this.cdr.markForCheck();
  }

  constructor(private cdr: ChangeDetectorRef) {}

  prevYear(): void { this.year--; this.cdr.markForCheck(); }
  nextYear(): void { this.year++; this.cdr.markForCheck(); }

  get filteredHolidays(): Holiday[] {
    return [...this.holidays]
      .filter(h => h.date.startsWith(String(this.year)))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  monthGroups(): { month: string; items: Holiday[] }[] {
    const groups: Record<string, Holiday[]> = {};
    this.filteredHolidays.forEach(h => {
      const key = h.date.substring(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(h);
    });
    return Object.entries(groups).map(([month, items]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      items
    }));
  }

  openAdd(): void {
    this.editTarget = null;
    this.form = { name: '', date: `${this.year}-01-01`, type: 'PUBLIC', description: '' };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEdit(h: Holiday): void {
    this.editTarget = h;
    this.form = { name: h.name, date: h.date, type: h.type, description: h.description ?? '' };
    this.showModal = true;
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.form.name.trim() || !this.form.date) return;
    if (this.editTarget) {
      const idx = this.holidays.findIndex(h => h.id === this.editTarget!.id);
      if (idx > -1) this.holidays[idx] = { ...this.form, id: this.editTarget.id };
    } else {
      this.holidays.push({ ...this.form, id: this.nextId++ });
    }
    this.showModal = false;
    this.cdr.markForCheck();
  }

  doDelete(): void {
    if (!this.deleteTarget) return;
    this.holidays = this.holidays.filter(h => h.id !== this.deleteTarget!.id);
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  typeClass(t: string): string {
    return t === 'PUBLIC' ? 'badge-ok' : t === 'COMPANY' ? 'badge-info' : 'badge-warn';
  }

  typeLabel(t: string): string {
    return t === 'PUBLIC' ? 'Public' : t === 'COMPANY' ? 'Company' : 'Optional';
  }

  get totalCount(): number    { return this.filteredHolidays.length; }
  get publicCount(): number   { return this.filteredHolidays.filter(h => h.type === 'PUBLIC').length; }
  get companyCount(): number  { return this.filteredHolidays.filter(h => h.type === 'COMPANY').length; }
  get optionalCount(): number { return this.filteredHolidays.filter(h => h.type === 'OPTIONAL').length; }
}
