import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';

// ── Interfaces ──────────────────────────────────────────
interface LiveMetric {
  label: string;
  value: string;
  rawValue: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  trendLabel: string;
  iconBg: string;
  iconColor: string;
  iconKey: string;
  extra: { left: string; right: string } | null;
  progress: number | null;
  progressColor: string | null;
  statusLabel: string | null;
}

interface AlertItem {
  id: number;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  action: string;
  dismissed: boolean;
}

interface ServiceStatus {
  name: string;
  uptime: string;
  status: 'success' | 'warning' | 'error';
  latency: string;
}

interface LogEntry {
  id: number;
  time: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  service: string;
  message: string;
}

interface Region {
  name: string;
  code: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: string;
  load: number;
}

interface ScalingService {
  name: string;
  current: number;
  min: number;
  max: number;
  autoScale: boolean;
  cpuTrigger: number;
}

// ── Component ──────────────────────────────────────────
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  today: string = '';
  activeTimeFilter: string = '1H';
  activeLogFilter: string = 'ALL';
  showLogsViewer = false;
  showScalingPanel = false;
  showRegionPanel = false;
  private pollInterval: any;
  private logInterval: any;

  // ── Nav ────────────────────────────────────────────
  navItems = [
    { label: 'Dashboard',       route: '/admin',          active: true  },
    { label: 'User',            route: '/admin/users',              active: false },
    { label: 'Subscription',    route: '/admin/subscriptions',      active: false },
    { label: 'Security',        route: '/admin/security',           active: false },
    { label: 'Notifications',   route: '/admin/notifications',      active: false },
    { label: 'RBAC',            route: '/admin/rbac',               active: false },
    { label: 'Products',        route: '/admin/products',           active: false },
    { label: 'Configuration',   route: '/admin/configuration',      active: false },
    { label: 'AI Control',      route: '/admin/ai-control',         active: false },
    // { label: 'System Monitoring', route: '/admin/system-monitoring', active: false },
  ];

  // ── Metrics ────────────────────────────────────────
  metrics: LiveMetric[] = [
    {
      label: 'Active Users',      value: '2,847',  rawValue: 2847,  unit: '',
      trend: 'up',    trendValue: '12.5%', trendLabel: 'vs last hour',
      iconBg: '#EFF6FF', iconColor: '#2563EB', iconKey: 'users',
      extra: { left: 'Peak: 3,124', right: 'Avg: 2,456' },
      progress: null, progressColor: null, statusLabel: null
    },
    {
      label: 'System Uptime',     value: '99.98%', rawValue: 99.98, unit: '%',
      trend: 'neutral', trendValue: 'Operational', trendLabel: '',
      iconBg: '#F0FDF4', iconColor: '#16A34A', iconKey: 'uptime',
      extra: { left: 'Last incident: 14d ago', right: '45d streak' },
      progress: null, progressColor: null, statusLabel: 'Operational'
    },
    {
      label: 'CPU Usage',         value: '67.3%',  rawValue: 67.3,  unit: '%',
      trend: 'down',  trendValue: '5.2%',  trendLabel: 'vs last hour',
      iconBg: '#FFFBEB', iconColor: '#D97706', iconKey: 'cpu',
      extra: null,
      progress: 67.3, progressColor: '#D97706', statusLabel: null
    },
    {
      label: 'Memory Usage',      value: '71.4%',  rawValue: 71.4,  unit: '%',
      trend: 'up',    trendValue: '3.8%',  trendLabel: 'vs last hour',
      iconBg: '#FFF1F2', iconColor: '#E11D48', iconKey: 'memory',
      extra: null,
      progress: 71.4, progressColor: '#E11D48', statusLabel: null
    },
    {
      label: 'DB Connections',    value: '284',    rawValue: 284,   unit: '',
      trend: 'up',    trendValue: '12',    trendLabel: 'new connections',
      iconBg: '#F0FDF4', iconColor: '#16A34A', iconKey: 'db',
      extra: { left: 'Max Pool: 500', right: 'Idle: 216' },
      progress: 56.8, progressColor: '#16A34A', statusLabel: null
    },
    {
      label: 'API Response',      value: '142ms',  rawValue: 142,   unit: 'ms',
      trend: 'down',  trendValue: '18ms',  trendLabel: 'improvement',
      iconBg: '#EFF6FF', iconColor: '#2563EB', iconKey: 'api',
      extra: { left: 'Peak: 287ms', right: 'P99: 310ms' },
      progress: null, progressColor: null, statusLabel: null
    },
    {
      label: 'Error Rate',        value: '0.02%',  rawValue: 0.02,  unit: '%',
      trend: 'down',  trendValue: '0.01%', trendLabel: 'vs last hour',
      iconBg: '#F0FDF4', iconColor: '#16A34A', iconKey: 'error',
      extra: { left: '4xx: 0.015%', right: '5xx: 0.005%' },
      progress: null, progressColor: null, statusLabel: null
    },
    {
      label: 'Monthly Revenue',   value: '$284.7K', rawValue: 284700, unit: '',
      trend: 'up',    trendValue: '18.2%', trendLabel: 'vs last month',
      iconBg: '#F5F3FF', iconColor: '#7C3AED', iconKey: 'revenue',
      extra: { left: 'MRR: $284.7K', right: 'ARR: $3.4M' },
      progress: null, progressColor: null, statusLabel: null
    }
  ];

  // ── Alerts ─────────────────────────────────────────
  alerts: AlertItem[] = [
    {
      id: 1, level: 'critical',
      title: 'Memory Leak Detected',
      message: 'Heap usage growing at 2.4MB/min on node-prod-03. Memory exceeded 85% threshold.',
      timestamp: '2026-02-20 02:47:23 UTC', action: 'Investigate', dismissed: false
    },
    {
      id: 2, level: 'warning',
      title: 'Traffic Spike — EU Region',
      message: 'Traffic increased by 340% in the last 15 minutes from EU-WEST-1 region.',
      timestamp: '2026-02-20 02:52:11 UTC', action: 'Review', dismissed: false
    },
    {
      id: 3, level: 'critical',
      title: 'Multiple Failed Login Attempts',
      message: '47 failed login attempts from IP 192.168.1.254 in last 10 minutes. Possible brute force.',
      timestamp: '2026-02-20 03:01:45 UTC', action: 'Block IP', dismissed: false
    },
    {
      id: 4, level: 'warning',
      title: 'Auto Scaling Triggered',
      message: 'CPU exceeded 80% on api-gateway. Added 2 instances automatically.',
      timestamp: '2026-02-20 03:05:12 UTC', action: 'View', dismissed: false
    }
  ];

  // ── Services ───────────────────────────────────────
  services: ServiceStatus[] = [
    { name: 'Authentication API', uptime: '99.9%',  status: 'success', latency: '23ms'  },
    { name: 'Payment Gateway',    uptime: '100%',   status: 'success', latency: '41ms'  },
    { name: 'Email Service',      uptime: '98.2%',  status: 'warning', latency: '180ms' },
    { name: 'Database Cluster',   uptime: '99.8%',  status: 'success', latency: '8ms'   },
    { name: 'CDN Network',        uptime: '100%',   status: 'success', latency: '12ms'  },
    { name: 'Search Engine',      uptime: '99.5%',  status: 'success', latency: '55ms'  },
    { name: 'Notification Hub',   uptime: '97.1%',  status: 'warning', latency: '210ms' },
    { name: 'File Storage',       uptime: '100%',   status: 'success', latency: '30ms'  },
  ];

  // ── Logs ───────────────────────────────────────────
  logFilters = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

  allLogs: LogEntry[] = [
    { id: 1,  time: '03:01:45', level: 'ERROR', service: 'auth-service',    message: 'Failed login attempt from 192.168.1.254 — attempt 47/50' },
    { id: 2,  time: '03:00:12', level: 'WARN',  service: 'api-gateway',     message: 'Response time exceeded 250ms threshold: 287ms' },
    { id: 3,  time: '02:59:33', level: 'INFO',  service: 'payment-service', message: 'Transaction TXN-0029382 processed successfully' },
    { id: 4,  time: '02:58:02', level: 'ERROR', service: 'memory-monitor',  message: 'Heap leak detected on node-prod-03: +2.4MB/min' },
    { id: 5,  time: '02:57:11', level: 'WARN',  service: 'cdn-edge',        message: 'EU-WEST-1 traffic spike: 340% above baseline' },
    { id: 6,  time: '02:55:44', level: 'INFO',  service: 'db-cluster',      message: 'Read replica promoted to primary on DB-node-02' },
    { id: 7,  time: '02:54:19', level: 'DEBUG', service: 'cache-service',   message: 'Cache eviction triggered: LRU policy applied' },
    { id: 8,  time: '02:53:08', level: 'INFO',  service: 'scale-manager',   message: 'Auto-scaled api-gateway: 4 → 6 instances' },
    { id: 9,  time: '02:51:55', level: 'WARN',  service: 'email-service',   message: 'SMTP queue depth high: 1,240 pending messages' },
    { id: 10, time: '02:50:30', level: 'ERROR', service: 'file-storage',    message: 'Upload timeout for user-2847: connection reset' },
    { id: 11, time: '02:49:17', level: 'INFO',  service: 'auth-service',    message: 'Session token rotated for admin user sarah.mitchell' },
    { id: 12, time: '02:48:04', level: 'DEBUG', service: 'api-gateway',     message: 'Route /api/v2/orders matched in 0.3ms' },
  ];

  // ── Regions ────────────────────────────────────────
  regions: Region[] = [
    { name: 'US East',     code: 'US-EAST-1',   status: 'healthy',  latency: '18ms',  load: 64 },
    { name: 'EU West',     code: 'EU-WEST-1',   status: 'degraded', latency: '112ms', load: 89 },
    { name: 'AP South',    code: 'AP-SOUTH-1',  status: 'healthy',  latency: '42ms',  load: 47 },
    { name: 'US West',     code: 'US-WEST-2',   status: 'healthy',  latency: '24ms',  load: 52 },
  ];

  // ── Scaling ────────────────────────────────────────
  scalingServices: ScalingService[] = [
    { name: 'API Gateway',    current: 6,  min: 2, max: 20, autoScale: true,  cpuTrigger: 80 },
    { name: 'Auth Service',   current: 4,  min: 2, max: 10, autoScale: true,  cpuTrigger: 75 },
    { name: 'Worker Nodes',   current: 8,  min: 4, max: 32, autoScale: true,  cpuTrigger: 70 },
    { name: 'DB Read Nodes',  current: 3,  min: 1, max: 8,  autoScale: false, cpuTrigger: 85 },
  ];

  // ── Quick Access ───────────────────────────────────
  quickAccess = [
    { label: 'Monitoring', route: '/admin/system-monitoring', icon: 'monitor'   },
    { label: 'Users',      route: '/admin/users',             icon: 'users'     },
    { label: 'Security',   route: '/admin/security',          icon: 'shield'    },
    { label: 'Analytics',  route: '/admin/analytics',         icon: 'chart-bar' },
  ];

  // ── Performance Stats ──────────────────────────────
  performanceStats = [
    { label: 'Average',    value: '142ms',  success: false },
    { label: 'Peak',       value: '287ms',  success: false },
    { label: 'Error Rate', value: '0.02%',  success: true  },
  ];

  // ── Computed ───────────────────────────────────────
  get activeAlerts(): AlertItem[] {
    return this.alerts.filter(a => !a.dismissed);
  }

  get filteredLogs(): LogEntry[] {
    if (this.activeLogFilter === 'ALL') return this.allLogs;
    return this.allLogs.filter(l => l.level === this.activeLogFilter);
  }

  // ── Lifecycle ──────────────────────────────────────
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollInterval)  clearInterval(this.pollInterval);
    if (this.logInterval)   clearInterval(this.logInterval);
  }

  // ── Polling (simulates WebSocket / live data) ──────
  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.simulateLiveUpdates();
    }, 3000);

    this.logInterval = setInterval(() => {
      this.pushNewLog();
    }, 5000);
  }

  private simulateLiveUpdates(): void {
    // Active Users — fluctuates ±50
    const userMetric = this.metrics[0];
    const delta = Math.floor(Math.random() * 100) - 50;
    userMetric.rawValue = Math.max(2000, userMetric.rawValue + delta);
    userMetric.value = userMetric.rawValue.toLocaleString();

    // CPU — fluctuates ±3%
    const cpuMetric = this.metrics[2];
    const cpuDelta = (Math.random() * 6) - 3;
    cpuMetric.rawValue = Math.min(99, Math.max(20, cpuMetric.rawValue + cpuDelta));
    cpuMetric.value = cpuMetric.rawValue.toFixed(1) + '%';
    cpuMetric.progress = cpuMetric.rawValue;

    // Memory — fluctuates ±2%
    const memMetric = this.metrics[3];
    const memDelta = (Math.random() * 4) - 2;
    memMetric.rawValue = Math.min(99, Math.max(30, memMetric.rawValue + memDelta));
    memMetric.value = memMetric.rawValue.toFixed(1) + '%';
    memMetric.progress = memMetric.rawValue;

    // DB Connections — fluctuates ±10
    const dbMetric = this.metrics[4];
    const dbDelta = Math.floor(Math.random() * 20) - 10;
    dbMetric.rawValue = Math.max(100, dbMetric.rawValue + dbDelta);
    dbMetric.value = dbMetric.rawValue.toString();
    dbMetric.progress = Math.round((dbMetric.rawValue / 500) * 100);
  }

  private pushNewLog(): void {
    const services = ['api-gateway', 'auth-service', 'db-cluster', 'cdn-edge', 'cache-service'];
    const levels: ('ERROR' | 'WARN' | 'INFO' | 'DEBUG')[] = ['ERROR', 'WARN', 'INFO', 'INFO', 'DEBUG'];
    const messages = [
      'Health check passed',
      'Request rate 1,240 req/s',
      'Cache hit ratio 94.2%',
      'DB query took 320ms',
      'Token refresh completed'
    ];
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);
    const idx = Math.floor(Math.random() * 5);
    const newLog: LogEntry = {
      id: Date.now(),
      time: timeStr,
      level: levels[idx],
      service: services[idx],
      message: messages[idx]
    };
    this.allLogs = [newLog, ...this.allLogs.slice(0, 49)];
  }

  // ── Actions ────────────────────────────────────────
  dismissAlert(id: number): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) alert.dismissed = true;
  }

  setTimeFilter(filter: string): void {
    this.activeTimeFilter = filter;
  }

  setLogFilter(filter: string): void {
    this.activeLogFilter = filter;
  }

  toggleLogsViewer(): void {
    this.showLogsViewer = !this.showLogsViewer;
  }

  exportLogs(): void {
    const rows = this.filteredLogs.map(l =>
      `${l.time},${l.level},${l.service},"${l.message}"`
    );
    const csv = ['Time,Level,Service,Message', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  toggleScalingPanel(): void {
    this.showScalingPanel = !this.showScalingPanel;
  }

  toggleRegionPanel(): void {
    this.showRegionPanel = !this.showRegionPanel;
  }

  toggleAutoScale(svc: ScalingService): void {
    svc.autoScale = !svc.autoScale;
  }

  scaleUp(svc: ScalingService): void {
    if (svc.current < svc.max) svc.current++;
  }

  scaleDown(svc: ScalingService): void {
    if (svc.current > svc.min) svc.current--;
  }

  handleEmergency(action: string): void {
    console.log(`Emergency action triggered: ${action}`);
    // Wire to backend service here
  }

  getLogLevelClass(level: string): string {
    const map: Record<string, string> = {
      ERROR: 'log-error', WARN: 'log-warn',
      INFO: 'log-info',   DEBUG: 'log-debug'
    };
    return map[level] || '';
  }

  getRegionStatusClass(status: string): string {
    const map: Record<string, string> = {
      healthy: 'dot-success', degraded: 'dot-warning', down: 'dot-error'
    };
    return map[status] || '';
  }
}
