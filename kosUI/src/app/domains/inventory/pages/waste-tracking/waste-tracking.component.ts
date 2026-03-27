import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface WasteEntry {
  date: string;
  item: string;
  category: string;
  quantity: number;
  unit: string;
  reason: string;
  cost: number;
  recordedBy: string;
}

interface WeekSummary {
  week: string;
  totalWaste: string;
  cost: number;
  vsLastWeek: number;
}

interface CategoryBar {
  label: string;
  amount: number;
  pct: number;
  color: string;
}

interface ReasonBar {
  label: string;
  count: number;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-waste-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './waste-tracking.component.html',
  styleUrls: ['./waste-tracking.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WasteTrackingComponent {
  activeTab: 'entry' | 'reports' | 'analytics' | 'trends' = 'entry';
  showInfo = false;
  activeDateRange = 'Week';
  dateRanges = ['Today', 'Week', 'Month', 'Year'];

  // Waste entry form model
  wasteForm = {
    item: '',
    category: '',
    quantity: 0,
    unit: 'kg',
    reason: '',
    cost: 0,
    notes: ''
  };

  wasteEntries: WasteEntry[] = [
    { date: '2026-03-27', item: 'Tomatoes',       category: 'Food',      quantity: 2.5, unit: 'kg',  reason: 'Expired',    cost: 250,  recordedBy: 'Chef Ramesh' },
    { date: '2026-03-27', item: 'Bread Loaves',   category: 'Food',      quantity: 4,   unit: 'pcs', reason: 'Overcooked',  cost: 320,  recordedBy: 'Chef Arjun' },
    { date: '2026-03-26', item: 'Cooking Oil',    category: 'Food',      quantity: 1.2, unit: 'L',   reason: 'Spillage',   cost: 180,  recordedBy: 'Staff Meena' },
    { date: '2026-03-26', item: 'Plastic Bags',   category: 'Packaging', quantity: 50,  unit: 'pcs', reason: 'Damaged',    cost: 100,  recordedBy: 'Manager Priya' },
    { date: '2026-03-25', item: 'Fresh Juice',    category: 'Beverage',  quantity: 3,   unit: 'L',   reason: 'Expired',    cost: 450,  recordedBy: 'Staff Meena' }
  ];

  allWasteEntries: WasteEntry[] = [
    { date: '2026-03-27', item: 'Tomatoes',        category: 'Food',      quantity: 2.5,  unit: 'kg',  reason: 'Expired',    cost: 250,  recordedBy: 'Chef Ramesh' },
    { date: '2026-03-27', item: 'Bread Loaves',    category: 'Food',      quantity: 4,    unit: 'pcs', reason: 'Overcooked',  cost: 320,  recordedBy: 'Chef Arjun' },
    { date: '2026-03-26', item: 'Cooking Oil',     category: 'Food',      quantity: 1.2,  unit: 'L',   reason: 'Spillage',   cost: 180,  recordedBy: 'Staff Meena' },
    { date: '2026-03-26', item: 'Plastic Bags',    category: 'Packaging', quantity: 50,   unit: 'pcs', reason: 'Damaged',    cost: 100,  recordedBy: 'Manager Priya' },
    { date: '2026-03-25', item: 'Fresh Juice',     category: 'Beverage',  quantity: 3,    unit: 'L',   reason: 'Expired',    cost: 450,  recordedBy: 'Staff Meena' },
    { date: '2026-03-25', item: 'Chicken Wings',   category: 'Food',      quantity: 1.8,  unit: 'kg',  reason: 'Overcooked',  cost: 540,  recordedBy: 'Chef Ramesh' },
    { date: '2026-03-24', item: 'Milk',            category: 'Food',      quantity: 5,    unit: 'L',   reason: 'Expired',    cost: 375,  recordedBy: 'Chef Arjun' },
    { date: '2026-03-24', item: 'Paper Cups',      category: 'Packaging', quantity: 100,  unit: 'pcs', reason: 'Damaged',    cost: 80,   recordedBy: 'Manager Priya' },
    { date: '2026-03-23', item: 'Paneer',          category: 'Food',      quantity: 1.5,  unit: 'kg',  reason: 'Expired',    cost: 450,  recordedBy: 'Chef Ramesh' },
    { date: '2026-03-23', item: 'Soft Drinks',     category: 'Beverage',  quantity: 6,    unit: 'pcs', reason: 'Damaged',    cost: 270,  recordedBy: 'Staff Meena' },
    { date: '2026-03-22', item: 'Dal Makhani',     category: 'Food',      quantity: 3.2,  unit: 'kg',  reason: 'Overcooked',  cost: 480,  recordedBy: 'Chef Arjun' },
    { date: '2026-03-22', item: 'Foil Wrap',       category: 'Packaging', quantity: 20,   unit: 'pcs', reason: 'Other',      cost: 60,   recordedBy: 'Manager Priya' },
    { date: '2026-03-21', item: 'Rice (cooked)',   category: 'Food',      quantity: 4,    unit: 'kg',  reason: 'Expired',    cost: 360,  recordedBy: 'Chef Ramesh' },
    { date: '2026-03-20', item: 'Fish Curry',      category: 'Food',      quantity: 2.1,  unit: 'kg',  reason: 'Overcooked',  cost: 630,  recordedBy: 'Chef Arjun' },
    { date: '2026-03-19', item: 'Mineral Water',   category: 'Beverage',  quantity: 10,   unit: 'pcs', reason: 'Damaged',    cost: 200,  recordedBy: 'Staff Meena' }
  ];

  categoryBars: CategoryBar[] = [
    { label: 'Food',      amount: 8200, pct: 100, color: '#dc2626' },
    { label: 'Packaging', amount: 2100, pct: 26,  color: '#d97706' },
    { label: 'Beverage',  amount: 1800, pct: 22,  color: '#1d4ed8' },
    { label: 'Other',     amount: 600,  pct: 7,   color: '#7c3aed' }
  ];

  reasonBars: ReasonBar[] = [
    { label: 'Expired',   count: 42, pct: 42, color: '#dc2626' },
    { label: 'Overcooked', count: 28, pct: 28, color: '#d97706' },
    { label: 'Damaged',   count: 18, pct: 18, color: '#1d4ed8' },
    { label: 'Spillage',  count: 8,  pct: 8,  color: '#ea580c' },
    { label: 'Other',     count: 4,  pct: 4,  color: '#7c3aed' }
  ];

  weekSummaries: WeekSummary[] = [
    { week: 'Mar 22 – 28, 2026', totalWaste: '28.4 kg',  cost: 12800, vsLastWeek: -8 },
    { week: 'Mar 15 – 21, 2026', totalWaste: '31.2 kg',  cost: 13900, vsLastWeek: 12 },
    { week: 'Mar 08 – 14, 2026', totalWaste: '27.8 kg',  cost: 12400, vsLastWeek: -5 },
    { week: 'Mar 01 – 07, 2026', totalWaste: '29.6 kg',  cost: 13100, vsLastWeek: 6 }
  ];

  // SVG line chart data
  weeklyData = [2100, 1800, 2400, 3200, 1900, 2800, 2340];
  dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  get linePoints(): string {
    const w = 400;
    const h = 60;
    const pad = 10;
    const maxVal = Math.max(...this.weeklyData);
    const xStep = (w - pad * 2) / (this.weeklyData.length - 1);
    return this.weeklyData
      .map((v, i) => {
        const x = pad + i * xStep;
        const y = h - pad - ((v / maxVal) * (h - pad * 2));
        return `${x},${y}`;
      })
      .join(' ');
  }

  get lineAreaPath(): string {
    const w = 400;
    const h = 60;
    const pad = 10;
    const maxVal = Math.max(...this.weeklyData);
    const xStep = (w - pad * 2) / (this.weeklyData.length - 1);
    const points = this.weeklyData.map((v, i) => {
      const x = pad + i * xStep;
      const y = h - pad - ((v / maxVal) * (h - pad * 2));
      return `${x},${y}`;
    });
    const firstX = pad;
    const lastX = pad + (this.weeklyData.length - 1) * xStep;
    return `M${firstX},${h - pad} L${points.join(' L')} L${lastX},${h - pad} Z`;
  }

  submitWaste(): void {
    if (this.wasteForm.item.trim() && this.wasteForm.quantity > 0) {
      const entry: WasteEntry = {
        date: new Date().toISOString().split('T')[0],
        item: this.wasteForm.item,
        category: this.wasteForm.category,
        quantity: this.wasteForm.quantity,
        unit: this.wasteForm.unit,
        reason: this.wasteForm.reason,
        cost: this.wasteForm.cost,
        recordedBy: 'Current User'
      };
      this.wasteEntries.unshift(entry);
      this.allWasteEntries.unshift(entry);
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.wasteForm = { item: '', category: '', quantity: 0, unit: 'kg', reason: '', cost: 0, notes: '' };
  }

  getReasonBadge(reason: string): string {
    const map: Record<string, string> = {
      Expired: 'badge-red', Overcooked: 'badge-amber', Damaged: 'badge-blue',
      Spillage: 'badge-orange', Other: 'badge-purple'
    };
    return map[reason] || 'badge-blue';
  }
}
