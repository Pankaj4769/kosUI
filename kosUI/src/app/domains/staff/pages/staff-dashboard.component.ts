import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TableService } from '../../pos/services/table.service';
import { Table, TableStatus } from '../../pos/models/table.model';
import { StaffAnalyticsService } from '../services/staff-analytics.service';

interface StaffCard {
  name: string;
  load: number;
  efficiency: number;
  revenue: number;
  activeTables: number;
  rank: number;
  status: 'BUSY' | 'NORMAL' | 'IDLE';
  score?: number;

  // Enterprise Intelligence
  workloadIndex?: number;
  productivityIndex?: number;
  consistencyScore?: number;
  fatigueScore?: number;
  heatLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  trend?: 'UP' | 'DOWN' | 'STABLE';
  slaRisk?: boolean;
  
  // NEW: Additional metrics
  completedOrders?: number;
  avgServiceTime?: number;
  peakHours?: string;
  alertLevel?: 'NONE' | 'WARNING' | 'CRITICAL';
}

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffDashboardComponent implements OnInit, OnDestroy {

  tables: Table[] = [];
  staffCards: StaffCard[] = [];

  kpi = {
    totalStaff: 0,
    busyStaff: 0,
    idleStaff: 0,
    avgEfficiency: 0,
    totalRevenue: 0,
    avgRevenue: 0,
    totalActiveTables: 0
  };

  // Filter state
  filterStatus: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE' = 'ALL';
  sortBy: 'rank' | 'revenue' | 'efficiency' | 'load' = 'rank';

  private destroy$ = new Subject<void>();
  private cachedOrders: any[] = [];
  private allStaffCards: StaffCard[] = [];

  constructor(
    private tableService: TableService,
    private staffService: StaffAnalyticsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.tableService.tables$
      .pipe(takeUntil(this.destroy$))
      .subscribe(tables => {
        this.tables = [...tables];
        this.cachedOrders = this.buildOrders();
        this.buildDashboard();
        this.cdr.markForCheck();
      });

    // Auto-refresh every 10 seconds
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.buildDashboard();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ================= BUILD DASHBOARD ================= */

  buildDashboard() {
    const staffNames = Array.from(
      new Set(this.tables.map(t => t.waiter).filter(Boolean))
    ) as string[];

    if (staffNames.length === 0) {
      this.allStaffCards = [];
      this.staffCards = [];
      this.buildKpi();
      return;
    }

    const cards: StaffCard[] = staffNames.map(name => {
      const stats = this.staffService.calculate(name, this.tables, this.cachedOrders);

      const activeTables = this.tables.filter(
        t => t.waiter === name && t.status === 'occupied'
      ).length;

      // Enterprise composite score
      const score = Math.round(
        stats.loadScore * 0.35 +
        stats.efficiencyScore * 0.45 +
        Math.min(stats.revenue / 100, 100) * 0.20
      );

      // Smart status logic
      const status: 'BUSY' | 'NORMAL' | 'IDLE' =
        stats.loadScore > 75 || activeTables > 4 ? 'BUSY' :
        stats.loadScore < 15 && activeTables === 0 ? 'IDLE' :
        'NORMAL';

      // ================= ENTERPRISE INTELLIGENCE =================

      // Workload Index
      const workloadIndex = Math.min(
        Math.round((stats.loadScore + activeTables * 10) / 2),
        100
      );

      // Productivity Index
      const productivityIndex = Math.min(
        Math.round((stats.efficiencyScore * 0.6) + (Math.min(stats.revenue / 100, 100) * 0.4)),
        100
      );

      // Consistency Score
      const consistencyScore = Math.max(
        100 - Math.abs(stats.loadScore - stats.efficiencyScore),
        10
      );

      // Fatigue Score
      const fatigueScore = Math.min(
        Math.round(workloadIndex * 0.7 + (100 - stats.efficiencyScore) * 0.3),
        100
      );

      // Heat Level
      const heatLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
        workloadIndex > 75 ? 'HIGH' :
        workloadIndex > 40 ? 'MEDIUM' :
        'LOW';

      // Trend Detection
      const trend: 'UP' | 'DOWN' | 'STABLE' =
        stats.efficiencyScore > 70 && productivityIndex > 60 ? 'UP' :
        stats.efficiencyScore < 40 || productivityIndex < 30 ? 'DOWN' :
        'STABLE';

      // SLA Risk
      const slaRisk = stats.avgServiceTime > 60;

      // NEW: Alert Level
      const alertLevel: 'NONE' | 'WARNING' | 'CRITICAL' =
        fatigueScore > 80 || slaRisk ? 'CRITICAL' :
        fatigueScore > 60 || workloadIndex > 85 ? 'WARNING' :
        'NONE';

      // NEW: Peak Hours Detection (mock - can be enhanced with real data)
      const currentHour = new Date().getHours();
      const peakHours = currentHour >= 12 && currentHour <= 14 ? 'Lunch Rush' :
                        currentHour >= 19 && currentHour <= 21 ? 'Dinner Rush' :
                        'Off-Peak';

      return {
        name,
        load: stats.loadScore,
        efficiency: stats.efficiencyScore,
        revenue: stats.revenue,
        activeTables,
        rank: 0,
        status,
        score,
        workloadIndex,
        productivityIndex,
        consistencyScore,
        fatigueScore,
        heatLevel,
        trend,
        slaRisk,
        completedOrders: stats.completedOrders,
        avgServiceTime: stats.avgServiceTime,
        peakHours,
        alertLevel
      };
    });

    // Sort by selected criteria
    this.sortCards(cards);

    // Assign ranks
    cards.forEach((c, i) => c.rank = i + 1);

    this.allStaffCards = cards;
    this.applyFilter();
    this.buildKpi();
  }

  /* ================= SORTING ================= */

  private sortCards(cards: StaffCard[]) {
    switch (this.sortBy) {
      case 'rank':
      case 'efficiency':
        cards.sort((a, b) => (b.score || 0) - (a.score || 0));
        break;
      case 'revenue':
        cards.sort((a, b) => b.revenue - a.revenue);
        break;
      case 'load':
        cards.sort((a, b) => b.load - a.load);
        break;
    }
  }

  /* ================= FILTERING ================= */

  applyFilter() {
    if (this.filterStatus === 'ALL') {
      this.staffCards = [...this.allStaffCards];
    } else {
      this.staffCards = this.allStaffCards.filter(s => s.status === this.filterStatus);
    }
    this.cdr.markForCheck();
  }

  setFilter(status: 'ALL' | 'BUSY' | 'NORMAL' | 'IDLE') {
    this.filterStatus = status;
    this.applyFilter();
  }

  setSorting(sortBy: 'rank' | 'revenue' | 'efficiency' | 'load') {
    this.sortBy = sortBy;
    this.buildDashboard();
  }

  /* ================= KPI ================= */

  private buildKpi() {
    const totalStaff = this.allStaffCards.length;
    const busyStaff = this.allStaffCards.filter(s => s.status === 'BUSY').length;
    const idleStaff = this.allStaffCards.filter(s => s.status === 'IDLE').length;

    const avgEfficiency = totalStaff
      ? Math.round(this.allStaffCards.reduce((a, b) => a + b.efficiency, 0) / totalStaff)
      : 0;

    const totalRevenue = this.allStaffCards.reduce((a, b) => a + b.revenue, 0);
    const avgRevenue = totalStaff ? Math.round(totalRevenue / totalStaff) : 0;
    
    const totalActiveTables = this.allStaffCards.reduce((a, b) => a + b.activeTables, 0);

    this.kpi = {
      totalStaff,
      busyStaff,
      idleStaff,
      avgEfficiency,
      totalRevenue,
      avgRevenue,
      totalActiveTables
    };
  }

  /* ================= ORDERS CACHE ================= */

  private buildOrders() {
    return this.tables
      .filter(t => t.status !== 'available')
      .map(t => ({
        waiter: t.waiter,
        amount: t.amount || 0,
        duration: (t as any).duration || Math.floor(Math.random() * 45) + 15, // Mock duration
        status: t.status === 'available' ? 'PAID' : 'ACTIVE'
      }));
  }

  /* ================= ACTIONS ================= */

  viewStaffDetails(staff: StaffCard) {
    console.log('View staff details:', staff);
    // TODO: Navigate to staff detail page or open modal
  }

  assignTable(staff: StaffCard) {
    console.log('Assign table to:', staff.name);
    // TODO: Open table assignment modal
  }

  trackByName(_: number, staff: StaffCard) {
    return staff.name;
  }

  /* ================= HELPERS ================= */

  getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#fb923c';
    return '#ef4444';
  }

  getStaffCountByStatus(status: 'BUSY' | 'NORMAL' | 'IDLE'): number {
    return this.allStaffCards.filter(s => s.status === status).length;
  }
}
