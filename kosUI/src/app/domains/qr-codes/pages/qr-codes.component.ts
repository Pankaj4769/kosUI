import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QRCodeModule } from 'angularx-qrcode';
import { Subject, takeUntil } from 'rxjs';

import { Table, AreaType } from '../../pos/models/table.model';
import { TableService } from '../../pos/services/table.service';

export interface WaiterCall {
  id: string;
  tableId: number;
  tableName: string;
  tableNumber: number;
  area: string;
  calledAt: Date;
  acknowledged: boolean;
}

const AREA_LABELS: Record<string, string> = {
  'main-hall':  'Main Hall',
  'terrace':    'Terrace',
  'vip-lounge': 'VIP Lounge',
  'bar':        'Bar',
};

@Component({
  selector: 'app-qr-codes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, QRCodeModule],
  templateUrl: './qr-codes.component.html',
  styleUrls: ['./qr-codes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodesComponent implements OnInit, OnDestroy {

  /* ── Data ─────────────────────────────────────────── */
  tables: Table[]         = [];
  filteredTables: Table[] = [];

  /* ── Filters ──────────────────────────────────────── */
  searchQuery  = '';
  areaFilter   = 'all';
  statusFilter = 'all';

  /* ── Waiter calls panel ───────────────────────────── */
  waiterCalls: WaiterCall[] = [];
  showCallsPanel = false;

  /* ── Toast ────────────────────────────────────────── */
  toast: { msg: string; type: 'success' | 'info' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /* ── Base URL for customer QR links ──────────────── */
  get baseUrl(): string {
    return window.location.origin;
  }

  /* ── Stats ────────────────────────────────────────── */
  get stats() {
    return {
      total:     this.tables.length,
      available: this.tables.filter(t => t.status === 'available').length,
      occupied:  this.tables.filter(t => t.status === 'occupied').length,
      reserved:  this.tables.filter(t => t.status === 'reserved').length,
      activeCalls: this.waiterCalls.filter(c => !c.acknowledged).length,
    };
  }

  get areas(): string[] {
    const set = new Set(this.tables.map(t => t.area ?? 'main-hall'));
    return ['all', ...Array.from(set)];
  }

  get pendingCallCount(): number {
    return this.waiterCalls.filter(c => !c.acknowledged).length;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private tableSvc: TableService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.tableSvc.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.tables = tables;
        this.applyFilters();
        this.cdr.markForCheck();
      });

    // Seed a couple of demo waiter calls
    this.seedDemoCalls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  /* ── QR helpers ───────────────────────────────────── */

  getQrData(table: Table): string {
    return `${this.baseUrl}/customer/order?table=${table.id}`;
  }

  /* ── Filters ──────────────────────────────────────── */

  applyFilters(): void {
    let list = [...this.tables];
    if (this.areaFilter !== 'all') {
      list = list.filter(t => (t.area ?? 'main-hall') === this.areaFilter);
    }
    if (this.statusFilter !== 'all') {
      list = list.filter(t => t.status === this.statusFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.number.toString().includes(q) ||
        t.section?.toLowerCase().includes(q)
      );
    }
    this.filteredTables = list;
  }

  clearFilters(): void {
    this.searchQuery  = '';
    this.areaFilter   = 'all';
    this.statusFilter = 'all';
    this.applyFilters();
  }

  /* ── Area label helper ────────────────────────────── */

  areaLabel(area?: string): string {
    return AREA_LABELS[area ?? 'main-hall'] ?? 'Main Hall';
  }

  /* ── Print ────────────────────────────────────────── */

  printTable(table: Table): void {
    const qrEl = document.getElementById(`qr-${table.id}`);
    if (!qrEl) return;
    const img = qrEl.querySelector('img') as HTMLImageElement | null;
    const src = img?.src ?? '';

    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Code – ${table.name}</title>
      <style>
        body{font-family:sans-serif;text-align:center;padding:32px;}
        h2{margin:0 0 4px}p{color:#666;margin:0 0 20px}
        img{border:1px solid #ddd;border-radius:8px;padding:8px;}
        .info{font-size:13px;color:#444;margin-top:16px;}
      </style></head><body>
      <h2>${table.name}</h2>
      <p>${this.areaLabel(table.area)} · ${table.capacity} seats</p>
      <img src="${src}" width="200" height="200"/>
      <div class="info">Scan to view menu &amp; order</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  printAll(): void {
    const imgs: string[] = [];
    this.filteredTables.forEach(t => {
      const qrEl = document.getElementById(`qr-${t.id}`);
      const img  = qrEl?.querySelector('img') as HTMLImageElement | null;
      if (img?.src) {
        imgs.push(`
          <div class="card">
            <strong>${t.name}</strong>
            <span>${this.areaLabel(t.area)} · ${t.capacity} seats</span>
            <img src="${img.src}" width="140" height="140"/>
          </div>
        `);
      }
    });

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <html><head><title>All QR Codes</title>
      <style>
        body{font-family:sans-serif;padding:24px;}
        h1{font-size:20px;margin-bottom:20px;}
        .grid{display:flex;flex-wrap:wrap;gap:16px;}
        .card{border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center;width:170px;}
        .card strong{display:block;font-size:14px;}
        .card span{display:block;font-size:11px;color:#666;margin-bottom:8px;}
        .card img{border-radius:4px;}
      </style></head><body>
      <h1>Table QR Codes</h1>
      <div class="grid">${imgs.join('')}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  }

  /* ── Copy link ────────────────────────────────────── */

  copyLink(table: Table): void {
    const url = this.getQrData(table);
    navigator.clipboard.writeText(url).then(() => {
      this.showToast(`Link copied for ${table.name}`, 'success');
    }).catch(() => {
      this.showToast('Could not copy to clipboard', 'error');
    });
  }

  /* ── Waiter calls ─────────────────────────────────── */

  acknowledgeCall(call: WaiterCall): void {
    call.acknowledged = true;
    this.showToast(`Acknowledged call from ${call.tableName}`, 'info');
    this.cdr.markForCheck();
  }

  dismissCall(call: WaiterCall): void {
    this.waiterCalls = this.waiterCalls.filter(c => c.id !== call.id);
    this.cdr.markForCheck();
  }

  clearAllCalls(): void {
    this.waiterCalls = [];
    this.showCallsPanel = false;
    this.cdr.markForCheck();
  }

  hasActiveCall(tableId: number): boolean {
    return this.waiterCalls.some(c => c.tableId === tableId && !c.acknowledged);
  }

  simulateWaiterCall(table: Table): void {
    const existing = this.waiterCalls.find(c => c.tableId === table.id && !c.acknowledged);
    if (existing) {
      this.showToast(`${table.name} already has an active call`, 'info');
      return;
    }
    const call: WaiterCall = {
      id:          `call-${Date.now()}`,
      tableId:     table.id,
      tableName:   table.name,
      tableNumber: table.number,
      area:        this.areaLabel(table.area),
      calledAt:    new Date(),
      acknowledged: false,
    };
    this.waiterCalls = [call, ...this.waiterCalls];
    this.showCallsPanel = true;
    this.showToast(`Waiter called from ${table.name}`, 'info');
    this.cdr.markForCheck();
  }

  callElapsed(call: WaiterCall): string {
    const mins = Math.floor((Date.now() - call.calledAt.getTime()) / 60000);
    if (mins < 1) return 'just now';
    return `${mins}m ago`;
  }

  /* ── Toast ────────────────────────────────────────── */

  private showToast(msg: string, type: 'success' | 'info' | 'error'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { msg, type };
    this.cdr.markForCheck();
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.cdr.markForCheck();
    }, 2800);
  }

  /* ── TrackBy ──────────────────────────────────────── */

  trackTable(_: number, t: Table): number          { return t.id; }
  trackCall(_: number, c: WaiterCall): string      { return c.id; }

  /* ── Demo data ────────────────────────────────────── */

  private seedDemoCalls(): void {
    const now = Date.now();
    this.waiterCalls = [
      {
        id: 'call-demo-1',
        tableId: 2, tableName: 'Table 2', tableNumber: 2,
        area: 'Main Hall',
        calledAt: new Date(now - 3 * 60000),
        acknowledged: false,
      },
      {
        id: 'call-demo-2',
        tableId: 6, tableName: 'Table 6', tableNumber: 6,
        area: 'Main Hall',
        calledAt: new Date(now - 8 * 60000),
        acknowledged: false,
      },
    ];
  }
}
