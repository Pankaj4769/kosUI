import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DashboardAnalyticsService } from './model/dashboard-analytics.service';

import {
  DashboardKPI,
  CategoryStat,
  Alert,
  TopSellingItem,
  RecentOrder
} from './model/dashboard-analytics.model';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule
  ],

  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  constructor(private analytics: DashboardAnalyticsService) {}

  loading = false;
  lastUpdated: Date = new Date();
  autoRefresh = false;

  private refreshInterval: any = null;

  filter = {
    dateRange: 'today',
    category: 'all'
  };

  dateRanges = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' }
  ];

  categoriesList = [
    { label: 'All', value: 'all' },
    { label: 'Breakfast', value: 'Breakfast' },
    { label: 'Lunch', value: 'Lunch' },
    { label: 'Snacks', value: 'Snacks' },
    { label: 'Dinner', value: 'Dinner' }
  ];

  stats: DashboardKPI[] = [];
  categories: CategoryStat[] = [];
  alerts: Alert[] = [];
  topSelling: TopSellingItem[] = [];

  // 🔥 NOW FROM SERVICE
  recentOrders: RecentOrder[] = [];

  recentActivity: { text: string; time: string }[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.clearAutoRefresh();
  }

  loadDashboardData(): void {

    this.stats = this.analytics.generateKPIs();
    this.categories = this.analytics.categoryStats();
    this.alerts = this.analytics.generateAlerts();
    this.topSelling = this.analytics.getTopSellingItems();

    // 🔥 NEW – Recent Orders from service
    this.recentOrders = this.analytics.getRecentOrders();

    this.lastUpdated = new Date();
  }

  refresh(): void {
    this.loading = true;

    setTimeout(() => {
      this.loadDashboardData();
      this.loading = false;
      this.addActivity('Dashboard manually refreshed');
    }, 600);
  }

  filteredTopSelling(): TopSellingItem[] {

    if (this.filter.category === 'all') {
      return this.topSelling;
    }

    return this.topSelling.filter(
      i => i.category === this.filter.category
    );
  }

  get filteredCategories(): CategoryStat[] {

    if (this.filter.category === 'all') {
      return this.categories;
    }

    return this.categories.filter(
      c => c.name === this.filter.category
    );
  }

  toggleAutoRefresh(): void {

    this.autoRefresh = !this.autoRefresh;

    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.clearAutoRefresh();
    }
  }

  private startAutoRefresh(): void {

    this.clearAutoRefresh();

    this.refreshInterval = setInterval(() => {
      if (this.autoRefresh) {
        this.refresh();
      }
    }, 10000);

    this.addActivity('Auto refresh enabled');
  }

  private clearAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  exportToCSV(): void {

    const headers = 'Name,Sold,Revenue\n';

    const rows = this.filteredTopSelling()
      .map(i => `${i.name},${i.sold},${i.revenue}`)
      .join('\n');

    const csv = headers + rows;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${new Date().toISOString()}.csv`;
    a.click();

    window.URL.revokeObjectURL(url);

    this.addActivity('CSV report exported');
  }

  private addActivity(text: string): void {

    this.recentActivity.unshift({
      text,
      time: new Date().toLocaleTimeString()
    });

    if (this.recentActivity.length > 10) {
      this.recentActivity.pop();
    }
  }
}
