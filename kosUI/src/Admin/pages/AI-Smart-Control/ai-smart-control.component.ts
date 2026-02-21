import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface AnomalyEvent {
  id: number;
  type: string;
  tenant: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  status: 'open' | 'acknowledged' | 'resolved';
  metric: string;
  deviation: string;
}

export interface ChurnPrediction {
  tenantId: number;
  tenantName: string;
  plan: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastActive: string;
  usageDrop: number;
  triggerFactors: string[];
}

export interface RevenueForecast {
  month: string;
  actual: number | null;
  predicted: number;
}

export interface ScaleSuggestion {
  id: number;
  resource: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  impact: string;
  urgency: 'low' | 'medium' | 'high';
  autoApply: boolean;
}

export interface RiskAlert {
  id: number;
  title: string;
  category: string;
  description: string;
  affectedTenants: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  status: 'active' | 'monitoring' | 'resolved';
}

@Component({
  selector: 'app-ai-smart-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ai-smart-control.component.html',
  styleUrls: ['./ai-smart-control.component.css']
})
export class AiSmartControlComponent implements OnInit {

  activeTab = 'overview';
  today     = '';

  tabs = [
    { key: 'overview',   label: 'AI Overview'       },
    { key: 'anomaly',    label: 'Anomaly Detection' },
    { key: 'churn',      label: 'Churn Prediction'  },
    { key: 'revenue',    label: 'Revenue Forecast'  },
    { key: 'scale',      label: 'Auto-Scale'        },
    { key: 'risk',       label: 'Risk Alerts'       },
  ];

  /* ── AI Overview Stats ── */
  aiStats = [
    { label: 'Anomalies Detected',  value: '7',     sub: '3 critical',        iconBg: '#FFF1F2', iconColor: '#E11D48'  },
    { label: 'Churn Risk Tenants',  value: '23',    sub: '8 high risk',       iconBg: '#FEF3C7', iconColor: '#D97706'  },
    { label: 'MRR Forecast (Mar)',  value: '₹8.4L', sub: '+12% vs Feb',       iconBg: '#F0FDF4', iconColor: '#16A34A'  },
    { label: 'Scale Suggestions',   value: '4',     sub: '1 urgent',          iconBg: '#EFF6FF', iconColor: '#2563EB'  },
    { label: 'Active Risk Alerts',  value: '5',     sub: '2 high severity',   iconBg: '#F5F3FF', iconColor: '#7C3AED'  },
    { label: 'AI Model Accuracy',   value: '94.2%', sub: 'Last retrained 3d', iconBg: '#ECFDF5', iconColor: '#059669'  },
  ];

  /* ── AI Model Health ── */
  modelHealth = [
    { name: 'Churn Predictor',      accuracy: 94, lastRun: '2h ago',  status: 'healthy'  },
    { name: 'Anomaly Detector',     accuracy: 91, lastRun: '15m ago', status: 'healthy'  },
    { name: 'Revenue Forecaster',   accuracy: 88, lastRun: '6h ago',  status: 'healthy'  },
    { name: 'Scale Advisor',        accuracy: 86, lastRun: '1h ago',  status: 'warning'  },
    { name: 'Risk Classifier',      accuracy: 92, lastRun: '30m ago', status: 'healthy'  },
  ];

  /* ── Anomaly Detection ── */
  anomalies: AnomalyEvent[] = [
    {
      id: 1, type: 'Revenue Spike', tenant: 'Spice Bloom',
      description: 'Revenue 3.4x above 30-day average — possible fraud or data error',
      severity: 'high', detectedAt: '2026-02-20 14:22',
      status: 'open', metric: '₹84,200', deviation: '+240%'
    },
    {
      id: 2, type: 'API Abuse', tenant: 'Zaiqa Biryani',
      description: 'API calls 8x above normal rate limit threshold',
      severity: 'critical', detectedAt: '2026-02-20 11:30',
      status: 'acknowledged', metric: '48,000 req/hr', deviation: '+720%'
    },
    {
      id: 3, type: 'Login Anomaly', tenant: 'The Tandoori',
      description: 'Unusual login pattern — 14 failed attempts from 3 countries',
      severity: 'high', detectedAt: '2026-02-20 09:15',
      status: 'open', metric: '14 attempts', deviation: 'Multi-geo'
    },
    {
      id: 4, type: 'Order Drop', tenant: 'Curry House',
      description: 'Order volume dropped 78% compared to same day last week',
      severity: 'medium', detectedAt: '2026-02-20 08:00',
      status: 'open', metric: '12 orders', deviation: '-78%'
    },
    {
      id: 5, type: 'Storage Surge', tenant: 'Mumbai Masala',
      description: 'Storage usage grew 4GB in 2 hours — possible runaway upload',
      severity: 'medium', detectedAt: '2026-02-19 22:40',
      status: 'resolved', metric: '4 GB/2hr', deviation: '+1200%'
    },
    {
      id: 6, type: 'Billing Discrepancy', tenant: 'Biryani Bros',
      description: 'Invoice amount does not match usage data by ₹2,300',
      severity: 'low', detectedAt: '2026-02-19 18:10',
      status: 'resolved', metric: '₹2,300 diff', deviation: '8.4%'
    },
  ];

  /* ── Churn Predictions ── */
  churnPredictions: ChurnPrediction[] = [
    {
      tenantId: 1, tenantName: 'Curry House', plan: 'Basic',
      churnProbability: 87, riskLevel: 'high',
      lastActive: '8 days ago', usageDrop: 74,
      triggerFactors: ['Low login frequency', 'No orders 8d', 'Support ticket open']
    },
    {
      tenantId: 2, tenantName: 'Biryani Bros', plan: 'Basic+',
      churnProbability: 71, riskLevel: 'high',
      lastActive: '5 days ago', usageDrop: 61,
      triggerFactors: ['Feature usage declining', 'Plan downgrade viewed', 'Payment failed once']
    },
    {
      tenantId: 3, tenantName: 'Zaiqa Biryani', plan: 'Premium',
      churnProbability: 54, riskLevel: 'medium',
      lastActive: '2 days ago', usageDrop: 38,
      triggerFactors: ['Competitor mention in support', 'Feature request ignored']
    },
    {
      tenantId: 4, tenantName: 'Mumbai Masala', plan: 'Basic',
      churnProbability: 48, riskLevel: 'medium',
      lastActive: '3 days ago', usageDrop: 42,
      triggerFactors: ['Trial period ending soon', 'Low engagement score']
    },
    {
      tenantId: 5, tenantName: 'Saffron Garden', plan: 'Premium',
      churnProbability: 22, riskLevel: 'low',
      lastActive: 'Today', usageDrop: 12,
      triggerFactors: ['Minor usage dip last week']
    },
  ];

  /* ── Revenue Forecast ── */
  revenueForecast: RevenueForecast[] = [
    { month: 'Sep',  actual: 520000,  predicted: 510000  },
    { month: 'Oct',  actual: 580000,  predicted: 575000  },
    { month: 'Nov',  actual: 640000,  predicted: 635000  },
    { month: 'Dec',  actual: 710000,  predicted: 705000  },
    { month: 'Jan',  actual: 730000,  predicted: 728000  },
    { month: 'Feb',  actual: 748000,  predicted: 745000  },
    { month: 'Mar',  actual: null,    predicted: 840000  },
    { month: 'Apr',  actual: null,    predicted: 910000  },
    { month: 'May',  actual: null,    predicted: 985000  },
  ];

  forecastInsights = [
    { label: 'Feb Actual MRR',      value: '₹7.48L', color: '#2563EB' },
    { label: 'Mar Forecast',        value: '₹8.40L', color: '#16A34A' },
    { label: 'Q2 Forecast (total)', value: '₹27.35L',color: '#7C3AED' },
    { label: 'YoY Growth Rate',     value: '+34%',    color: '#D97706' },
  ];

  /* ── Scale Suggestions ── */
  scaleSuggestions: ScaleSuggestion[] = [
    {
      id: 1, resource: 'API Gateway Workers',
      currentValue: '4 workers', suggestedValue: '8 workers',
      reason: 'Peak-hour throughput exceeds capacity by 40% on weekdays',
      impact: 'Reduce p99 latency from 820ms → 180ms',
      urgency: 'high', autoApply: false
    },
    {
      id: 2, resource: 'Database Read Replicas',
      currentValue: '1 replica', suggestedValue: '3 replicas',
      reason: 'Read query queue depth averaging 120 during lunch hours',
      impact: 'Improve report generation speed by ~3x',
      urgency: 'high', autoApply: false
    },
    {
      id: 3, resource: 'Redis Cache Size',
      currentValue: '2 GB', suggestedValue: '4 GB',
      reason: 'Cache eviction rate at 34% — frequently hot keys being dropped',
      impact: 'Reduce DB load by ~25%',
      urgency: 'medium', autoApply: true
    },
    {
      id: 4, resource: 'Background Job Workers',
      currentValue: '2 workers', suggestedValue: '4 workers',
      reason: 'Invoice generation queue backing up during billing cycles',
      impact: 'Cut invoice processing delay from 14min → 3min',
      urgency: 'medium', autoApply: false
    },
  ];

  /* ── Risk Alerts ── */
  riskAlerts: RiskAlert[] = [
    {
      id: 1, title: 'Mass Churn Risk — Basic Plan',
      category: 'Churn', severity: 'critical',
      description: '18 Basic plan tenants showing simultaneous churn signals — possible product-market fit issue',
      affectedTenants: 18, detectedAt: '2026-02-20 08:00', status: 'active'
    },
    {
      id: 2, title: 'API Gateway Overload Risk',
      category: 'Infrastructure', severity: 'high',
      description: 'Projected API load will exceed capacity in 4 hours if current growth trend continues',
      affectedTenants: 0, detectedAt: '2026-02-20 12:00', status: 'active'
    },
    {
      id: 3, title: 'Payment Failure Cluster',
      category: 'Billing', severity: 'high',
      description: '11 tenants had payment failures within 6 hours — possible payment gateway issue',
      affectedTenants: 11, detectedAt: '2026-02-20 10:30', status: 'monitoring'
    },
    {
      id: 4, title: 'Feature Adoption Drop — KDS',
      category: 'Product', severity: 'medium',
      description: 'KDS usage fell 44% across Premium tenants in the last 7 days',
      affectedTenants: 34, detectedAt: '2026-02-19 09:00', status: 'monitoring'
    },
    {
      id: 5, title: 'Security Anomaly Cluster',
      category: 'Security', severity: 'high',
      description: '3 tenants triggered brute force detectors within 30 minutes — coordinated attack possible',
      affectedTenants: 3, detectedAt: '2026-02-20 11:30', status: 'active'
    },
  ];

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  /* ── Actions ── */
  setTab(k: string): void { this.activeTab = k; }

  acknowledgeAnomaly(a: AnomalyEvent): void {
    a.status = a.status === 'open' ? 'acknowledged' : 'resolved';
  }

  resolveAlert(r: RiskAlert): void { r.status = 'resolved'; }

  applyScale(s: ScaleSuggestion): void { s.autoApply = true; }

  /* ── Helpers ── */
  getSeverityClass(s: string): string {
    const m: Record<string, string> = {
      low: 'sev-low', medium: 'sev-med',
      high: 'sev-high', critical: 'sev-crit'
    };
    return m[s] ?? 'sev-low';
  }

  getAnomalyStatusClass(s: string): string {
    const m: Record<string, string> = {
      open: 'as-open', acknowledged: 'as-ack', resolved: 'as-resolved'
    };
    return m[s] ?? 'as-open';
  }

  getRiskStatusClass(s: string): string {
    const m: Record<string, string> = {
      active: 'rs-active', monitoring: 'rs-monitor', resolved: 'rs-resolved'
    };
    return m[s] ?? 'rs-active';
  }

  getUrgencyClass(u: string): string {
    const m: Record<string, string> = {
      low: 'urg-low', medium: 'urg-med', high: 'urg-high'
    };
    return m[u] ?? 'urg-low';
  }

  getChurnBarColor(p: number): string {
    return p >= 70 ? '#DC2626' : p >= 45 ? '#D97706' : '#16A34A';
  }

  getModelStatusClass(s: string): string {
    return s === 'healthy' ? 'ms-healthy' : s === 'warning' ? 'ms-warning' : 'ms-error';
  }

  get maxForecast(): number {
    return Math.max(...this.revenueForecast.map(r => r.predicted));
  }

  getForecastBarH(val: number | null): number {
    if (!val) return 0;
    return Math.round((val / this.maxForecast) * 100);
  }

  get openAnomalies(): number {
    return this.anomalies.filter(a => a.status === 'open').length;
  }
  get highChurnCount(): number {
    return this.churnPredictions.filter(c => c.riskLevel === 'high').length;
  }
  get activeRisks(): number {
    return this.riskAlerts.filter(r => r.status === 'active').length;
  }
  // ── Anomaly counts ──
get resolvedAnomalyCount(): number {
  return this.anomalies.filter(a => a.status === 'resolved').length;
}

get openAnomalyCount(): number {
  return this.anomalies.filter(a => a.status === 'open').length;
}

get monitoringRisks(): number {
  return this.riskAlerts.filter(r => r.status === 'monitoring').length;
}
getPlanClass(plan: string): string {
  return 'plan-' + plan.toLowerCase().replace('+', 'plus');
}
}
