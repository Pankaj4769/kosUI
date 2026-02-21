import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export type NotifType   = 'broadcast' | 'email' | 'push' | 'maintenance';
export type NotifStatus = 'sent' | 'scheduled' | 'draft' | 'failed';

export interface NotifRecord {
  id: number;
  title: string;
  message: string;
  type: NotifType;
  status: NotifStatus;
  audience: string;
  sentAt: string;
  openRate: number;
  clickRate: number;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit {

  activeTab = 'compose';
  today     = '';

  /* ── Tabs ── */
  tabs = [
    { key: 'compose',     label: 'Compose'          },
    { key: 'history',     label: 'History'          },
    { key: 'analytics',   label: 'Analytics'        },
    { key: 'maintenance', label: 'Maintenance Alert' },
  ];

  /* ── Summary Stats ── */
  notifStats = [
    { label: 'Sent Today',        value: '1,284', sub: '+210 vs yesterday', iconBg: '#EFF6FF', iconColor: '#2563EB' },
    { label: 'Email Delivery',    value: '98.4%', sub: 'Bounce rate 1.6%',  iconBg: '#F0FDF4', iconColor: '#16A34A' },
    { label: 'Push Open Rate',    value: '34.2%', sub: '+2.1% this week',   iconBg: '#F5F3FF', iconColor: '#7C3AED' },
    { label: 'Failed Deliveries', value: '12',    sub: 'Needs attention',   iconBg: '#FFF1F2', iconColor: '#E11D48' },
  ];

  /* ── Compose Form ── */
  composeForm = {
    type:        'broadcast' as NotifType,
    title:       '',
    message:     '',
    audience:    'all',
    urgency:     'normal',
    scheduledAt: ''
  };

  audienceOptions = [
    { value: 'all',       label: 'All Tenants (1,147)'    },
    { value: 'premium',   label: 'Premium + Ultra (516)'  },
    { value: 'basic',     label: 'Basic Users (542)'      },
    { value: 'trial',     label: 'Trial Users (89)'        },
    { value: 'expiring',  label: 'Expiring in 7 days (34)'},
    { value: 'suspended', label: 'Suspended (37)'         },
  ];

  notifTypes: Array<{ key: NotifType; icon: string; label: string }> = [
    { key: 'broadcast',   icon: '📢', label: 'Broadcast'   },
    { key: 'email',       icon: '📧', label: 'Email'        },
    { key: 'push',        icon: '🔔', label: 'Push'         },
    { key: 'maintenance', icon: '🔧', label: 'Maintenance'  },
  ];

  /* ── History ── */
  history: NotifRecord[] = [
    {
      id: 1, type: 'broadcast', status: 'sent',
      title: 'System Maintenance Tonight',
      message: 'Scheduled maintenance on Feb 21 from 2:00–4:00 AM IST.',
      audience: 'All Tenants', sentAt: '2026-02-20 09:00',
      openRate: 78, clickRate: 12
    },
    {
      id: 2, type: 'push', status: 'sent',
      title: 'New Feature: WhatsApp Notifications',
      message: 'Premium users can now enable WhatsApp order alerts.',
      audience: 'Premium + Ultra', sentAt: '2026-02-19 14:30',
      openRate: 61, clickRate: 28
    },
    {
      id: 3, type: 'email', status: 'sent',
      title: 'Invoice for February 2026',
      message: 'Your invoice INV-2026-0841 is ready for download.',
      audience: 'All Active Plans', sentAt: '2026-02-18 10:00',
      openRate: 85, clickRate: 45
    },
    {
      id: 4, type: 'email', status: 'scheduled',
      title: 'Plan Renewal Reminder',
      message: 'Your Basic plan renews in 7 days.',
      audience: 'Expiring in 7d', sentAt: '2026-02-25 08:00',
      openRate: 0, clickRate: 0
    },
    {
      id: 5, type: 'email', status: 'draft',
      title: 'Q1 Product Update Newsletter',
      message: 'Exciting new features arriving for all plans.',
      audience: 'All Tenants', sentAt: '—',
      openRate: 0, clickRate: 0
    },
    {
      id: 6, type: 'push', status: 'failed',
      title: 'Flash Sale: Upgrade Now',
      message: 'Limited-time offer on Ultra plan.',
      audience: 'Basic Users', sentAt: '2026-02-17 11:00',
      openRate: 0, clickRate: 0
    },
  ];

  /* ── Maintenance Form ── */
  maintenanceForm = {
    title:            'Scheduled Maintenance',
    message:          'We will perform maintenance. Services may be temporarily unavailable.',
    startTime:        '',
    endTime:          '',
    severity:         'medium',
    affectedServices: [] as string[]
  };

  allServices = ['POS Terminal', 'KDS Display', 'Reports', 'API Gateway', 'Billing', 'Authentication'];

  /* ── Analytics ── */
  deliveryStats = [
    { label: '📧 Email Delivery',    pct: 98, val: '98.4%', color: '#16A34A' },
    { label: '🔔 Push Open Rate',    pct: 34, val: '34.2%', color: '#2563EB' },
    { label: '📢 Broadcast Read',    pct: 72, val: '72.0%', color: '#7C3AED' },
    { label: '📧 Email Click Rate',  pct: 45, val: '45.0%', color: '#D97706' },
    { label: '🔔 Push Dismiss Rate', pct: 22, val: '22.0%', color: '#DC2626' },
  ];

  /* ── Lifecycle ── */
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  /* ── Actions ── */
  setTab(k: string): void { this.activeTab = k; }

  sendNotification(): void {
    if (!this.composeForm.title.trim() || !this.composeForm.message.trim()) return;
    const rec: NotifRecord = {
      id:        Date.now(),
      title:     this.composeForm.title,
      message:   this.composeForm.message,
      type:      this.composeForm.type,
      status:    this.composeForm.scheduledAt ? 'scheduled' : 'sent',
      audience:  this.audienceOptions.find(a => a.value === this.composeForm.audience)?.label || '',
      sentAt:    this.composeForm.scheduledAt
                   ? this.composeForm.scheduledAt
                   : new Date().toLocaleString('en-IN'),
      openRate:  0,
      clickRate: 0
    };
    this.history.unshift(rec);
    this.composeForm = {
      type: 'broadcast', title: '', message: '',
      audience: 'all', urgency: 'normal', scheduledAt: ''
    };
    this.activeTab = 'history';
  }

  sendMaintenanceAlert(): void {
    const rec: NotifRecord = {
      id:        Date.now(),
      title:     this.maintenanceForm.title,
      message:   this.maintenanceForm.message,
      type:      'maintenance',
      status:    'sent',
      audience:  'All Tenants',
      sentAt:    new Date().toLocaleString('en-IN'),
      openRate:  0,
      clickRate: 0
    };
    this.history.unshift(rec);
    this.activeTab = 'history';
  }

  toggleService(s: string): void {
    const i = this.maintenanceForm.affectedServices.indexOf(s);
    if (i === -1) this.maintenanceForm.affectedServices.push(s);
    else          this.maintenanceForm.affectedServices.splice(i, 1);
  }

  isServiceSelected(s: string): boolean {
    return this.maintenanceForm.affectedServices.includes(s);
  }

  /* ── Helpers ── */
  get topPerformers(): NotifRecord[] {
    return this.history
      .filter(n => n.status === 'sent' && n.openRate > 0)
      .sort((a, b) => b.openRate - a.openRate)
      .slice(0, 4);
  }

  get recentSent(): NotifRecord[] {
    return this.history.slice(0, 5);
  }

  getTypeClass(t: string): string {
    const m: Record<string, string> = {
      broadcast: 'tc-broadcast', email: 'tc-email',
      push: 'tc-push', maintenance: 'tc-maintenance'
    };
    return m[t] ?? 'tc-broadcast';
  }

  getStatusClass(s: string): string {
    const m: Record<string, string> = {
      sent: 'ns-sent', scheduled: 'ns-scheduled',
      draft: 'ns-draft', failed: 'ns-failed'
    };
    return m[s] ?? 'ns-draft';
  }

  getTypeIcon(t: string): string {
    const m: Record<string, string> = {
      broadcast: '📢', email: '📧', push: '🔔', maintenance: '🔧'
    };
    return m[t] ?? '📢';
  }

  getSeverityClass(s: string): string {
    const m: Record<string, string> = {
      low: 'sev-low', medium: 'sev-med', high: 'sev-high', critical: 'sev-crit'
    };
    return m[s] ?? 'sev-med';
  }
}
