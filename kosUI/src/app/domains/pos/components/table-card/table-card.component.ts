import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnDestroy,
  OnInit,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Table, TableStatus } from '../../models/table.model'; // ✅ Import from model
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-card.component.html',
  styleUrls: ['./table-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableCardComponent implements OnInit, OnDestroy {

  /* ================= INPUT / OUTPUT ================= */

  private _table = signal<Table | null>(null);
  
  @Input() staffStats: any;
  @Input()
  set table(value: Table) {
    this._table.set(value);
  }
  get table(): Table {
    return this._table()!;
  }

  @Output() tableSelected = new EventEmitter<number>();
  @Output() open = new EventEmitter<Table>();

  /* ================= LIFECYCLE ================= */

  private destroy$ = new Subject<void>();
  private alerted = false;

  ngOnInit(): void {
    // ⏱ Refresh every 10 seconds (safe & memory-leak free)
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkOverdueAlert());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= EVENTS ================= */

  onSelect(): void {
    const id = this.table?.id;
    if (id != null) {
      this.tableSelected.emit(id);
    }
  }

  onOpenClick(): void {
    this.open.emit(this.table);
  }

  /* ================= COMPUTED POS LOGIC ================= */

  // ✅ FIXED: Use model status values
  readonly statusLabel = computed(() => {
    const map: Record<TableStatus, string> = {
      'available': 'Available',
      'occupied': 'Occupied',
      'reserved': 'Reserved',
      'cleaning': 'Cleaning'
    };
    return map[this.table.status] ?? 'Unknown';
  });

  // ✅ FIXED: Use timeOccupied instead of openedAt
  readonly elapsedMinutes = computed(() => {
    const timeOccupied = this.table.timeOccupied;
    if (!timeOccupied) return 0;
    return Math.floor((Date.now() - new Date(timeOccupied).getTime()) / 60000);
  });

  readonly elapsedTime = computed(() => {
    const min = this.elapsedMinutes();
    if (!min) return '';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    return `${h}h ${min % 60}m`;
  });

  /* ================= SMART POS RULES ================= */

  // ✅ FIXED: Use 'occupied' status
  readonly isOverdue = computed(() =>
    this.table.status === 'occupied' && this.elapsedMinutes() >= 30
  );

  readonly priorityScore = computed(() => {
    if (this.table.status !== 'occupied') return 0;
    return Math.min(this.elapsedMinutes() * 2, 100);
  });

  readonly timeProgress = computed(() => {
    const limit = 60; // 60 min threshold
    return Math.min((this.elapsedMinutes() / limit) * 100, 100);
  });

  readonly waiterLoad = computed(() => {
    const amount = this.table.amount ?? 0;
    return Math.min((amount / 1000) * 100, 100);
  });

  // ✅ FIXED: Map model statuses to CSS classes
  readonly statusClass = computed(() => {
    if (this.isOverdue()) return 'status-overdue';

    const map: Record<TableStatus, string> = {
      'available': 'status-free',
      'occupied': 'status-open',
      'reserved': 'status-hold',
      'cleaning': 'status-cleaning'
    };
    return map[this.table.status] ?? 'status-unknown';
  });

  readonly hasAmount = computed(() => !!this.table.amount && this.table.amount > 0);

  readonly waiterName = computed(() => this.table.waiter || 'Unassigned');

  /* ================= SOUND ALERT ================= */

  private checkOverdueAlert(): void {
    if (this.isOverdue() && !this.alerted) {
      this.alerted = true;
      this.playAlertSound();
    }
    if (!this.isOverdue()) {
      this.alerted = false;
    }
  }

  private playAlertSound(): void {
    try {
      const audio = new Audio('/assets/sounds/alert.mp3');
      audio.volume = 0.6;
      audio.play().catch(() => {});
    } catch {}
  }
  
}
