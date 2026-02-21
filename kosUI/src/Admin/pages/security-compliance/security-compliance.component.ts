import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface AuditLog {
  id: number; user: string; action: string;
  ip: string; timestamp: string; status: 'success' | 'failed' | 'blocked';
}
export interface IPRule {
  id: number; ip: string; label: string;
  type: 'whitelist' | 'blacklist'; addedDate: string; active: boolean;
}
export interface ApiKey {
  id: number; name: string; key: string;
  createdDate: string; lastUsed: string; scopes: string[]; active: boolean;
}
export interface SessionEntry {
  id: number; tenantName: string; ip: string;
  device: string; loginTime: string; active: boolean; suspicious: boolean;
}
export interface GDPRRequest {
  id: number; tenantName: string; type: 'export' | 'delete';
  requestDate: string; status: 'pending' | 'completed' | 'rejected';
}

@Component({
  selector: 'app-security-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './security-compliance.component.html',
  styleUrls: ['./security-compliance.component.css']
})
export class SecurityComplianceComponent implements OnInit {

  activeTab       = 'overview';
  today           = '';
  showIPModal     = false;
  showKeyModal    = false;
  showGDPRModal   = false;
  selectedGDPR: GDPRRequest | null = null;
  twoFactorEnabled = true;
  encryptionLevel  = 'AES-256-GCM';
  gdprRetentionDays = 365;
  sessionTimeout    = 30;

  newIP  = { ip: '', label: '', type: 'whitelist' as 'whitelist' | 'blacklist' };
  newKey = { name: '', scopes: '' };

  tabs = [
    { key: 'overview',    label: 'Overview'         },
    { key: 'audit',       label: 'Audit Logs'       },
    { key: 'ip',          label: 'IP Rules'         },
    { key: 'sessions',    label: 'Sessions'         },
    { key: 'apikeys',     label: 'API Keys'         },
    { key: 'gdpr',        label: 'GDPR / Compliance'},
    { key: 'encryption',  label: 'Encryption'       },
  ];

  securityStats = [
    { label: 'Failed Logins Today', value: '14', sub: '↑ 3 from yesterday', iconBg: '#FFF1F2', iconColor: '#E11D48', iconKey: 'failed'  },
    { label: 'Active Sessions',     value: '847', sub: 'Across all tenants', iconBg: '#EFF6FF', iconColor: '#2563EB', iconKey: 'session' },
    { label: 'Blocked IPs',         value: '8',   sub: '3 added today',      iconBg: '#FFF7ED', iconColor: '#EA580C', iconKey: 'block'   },
    { label: '2FA Adoption',        value: '74%', sub: '+4% this month',      iconBg: '#F0FDF4', iconColor: '#16A34A', iconKey: 'twofa'  },
    { label: 'Active API Keys',     value: '23',  sub: '4 expiring soon',     iconBg: '#F5F3FF', iconColor: '#7C3AED', iconKey: 'key'    },
    { label: 'Suspicious Logins',   value: '3',   sub: 'Needs review',        iconBg: '#FFFBEB', iconColor: '#D97706', iconKey: 'susp'   },
  ];

  auditLogs: AuditLog[] = [
    { id:1,  user:'Rajesh Kumar',   action:'Login Success',           ip:'103.21.58.11',  timestamp:'2026-02-20 11:42', status:'success' },
    { id:2,  user:'Unknown',        action:'Failed Login x3',         ip:'45.89.192.12',  timestamp:'2026-02-20 11:30', status:'failed'  },
    { id:3,  user:'Priya Sharma',   action:'API Key Created',         ip:'49.36.102.4',   timestamp:'2026-02-20 10:15', status:'success' },
    { id:4,  user:'Unknown',        action:'Brute Force Attempt',     ip:'185.220.101.6', timestamp:'2026-02-20 09:00', status:'blocked' },
    { id:5,  user:'Mohammed Iqbal', action:'2FA Disabled',            ip:'192.168.1.254', timestamp:'2026-02-19 22:30', status:'success' },
    { id:6,  user:'Super Admin',    action:'IP Rule Added',           ip:'27.0.0.1',      timestamp:'2026-02-19 18:00', status:'success' },
    { id:7,  user:'Arjun Nair',     action:'GDPR Data Export',        ip:'117.55.2.44',   timestamp:'2026-02-19 14:22', status:'success' },
    { id:8,  user:'Unknown',        action:'Suspicious Login (Geo)',  ip:'195.88.54.9',   timestamp:'2026-02-19 02:14', status:'blocked' },
    { id:9,  user:'Divya Menon',    action:'Password Reset',          ip:'59.88.14.7',    timestamp:'2026-02-18 16:30', status:'success' },
    { id:10, user:'Super Admin',    action:'Session Terminated',      ip:'27.0.0.1',      timestamp:'2026-02-18 14:00', status:'success' },
  ];

  ipRules: IPRule[] = [
    { id:1, ip:'27.0.0.1',       label:'Office Network',  type:'whitelist', addedDate:'2025-10-01', active:true  },
    { id:2, ip:'103.21.58.0/24', label:'Bengaluru CDN',   type:'whitelist', addedDate:'2025-11-12', active:true  },
    { id:3, ip:'185.220.101.6',  label:'Known Attacker',  type:'blacklist', addedDate:'2026-02-20', active:true  },
    { id:4, ip:'45.89.192.12',   label:'Brute Force Bot', type:'blacklist', addedDate:'2026-02-20', active:true  },
    { id:5, ip:'195.88.54.9',    label:'Geo-blocked IP',  type:'blacklist', addedDate:'2026-02-19', active:true  },
  ];

  apiKeys: ApiKey[] = [
    { id:1, name:'POS Integration',  key:'kos_live_sk_a8f3...7k2m', createdDate:'2025-04-01', lastUsed:'2026-02-20', scopes:['orders.read','menu.read'],     active:true  },
    { id:2, name:'Analytics Export', key:'kos_live_sk_b9c1...4p5n', createdDate:'2025-09-15', lastUsed:'2026-02-19', scopes:['reports.read'],                active:true  },
    { id:3, name:'Webhook Receiver', key:'kos_live_sk_c2d4...8q9r', createdDate:'2026-01-01', lastUsed:'2026-02-18', scopes:['webhooks.write'],              active:true  },
    { id:4, name:'Legacy CRM',       key:'kos_live_sk_d5e6...1s2t', createdDate:'2024-06-10', lastUsed:'2025-12-01', scopes:['contacts.read','orders.read'], active:false },
  ];

  sessions: SessionEntry[] = [
    { id:1, tenantName:'Rajesh Kumar', ip:'103.21.58.11', device:'Chrome / Windows',  loginTime:'2026-02-20 11:42', active:true,  suspicious:false },
    { id:2, tenantName:'Priya Sharma', ip:'49.36.102.4',  device:'Safari / MacOS',    loginTime:'2026-02-20 08:55', active:true,  suspicious:false },
    { id:3, tenantName:'Arjun Nair',   ip:'117.55.2.44',  device:'Chrome / Windows',  loginTime:'2026-02-20 11:10', active:true,  suspicious:true  },
    { id:4, tenantName:'Divya Menon',  ip:'59.88.14.7',   device:'Firefox / Windows', loginTime:'2026-02-19 20:14', active:false, suspicious:false },
    { id:5, tenantName:'Karthik Raj',  ip:'202.88.4.10',  device:'Mobile / Android',  loginTime:'2026-02-20 10:30', active:true,  suspicious:false },
  ];

  gdprRequests: GDPRRequest[] = [
    { id:1, tenantName:'Arjun Nair',    type:'export', requestDate:'2026-02-19', status:'completed' },
    { id:2, tenantName:'Leela Das',     type:'delete', requestDate:'2026-02-15', status:'pending'   },
    { id:3, tenantName:'Santosh Gupta', type:'export', requestDate:'2026-02-10', status:'completed' },
    { id:4, tenantName:'Meera Pillai',  type:'delete', requestDate:'2026-02-05', status:'rejected'  },
  ];

  suspiciousEvents = [
    { event: 'Multiple failed logins',        ip: '45.89.192.12',  time: '2026-02-20 11:30', risk: 'High'   },
    { event: 'Login from new geolocation',    ip: '195.88.54.9',   time: '2026-02-19 02:14', risk: 'High'   },
    { event: 'After-hours API access spike',  ip: '117.55.2.44',   time: '2026-02-20 02:00', risk: 'Medium' },
    { event: 'Password changed then login',   ip: '192.168.1.254', time: '2026-02-19 23:45', risk: 'Low'    },
  ];

  encryptionSettings = [
    { label: 'Data at Rest',       algorithm: 'AES-256-GCM',    status: 'enabled',  lastRotated: '2026-01-01' },
    { label: 'Data in Transit',    algorithm: 'TLS 1.3',         status: 'enabled',  lastRotated: '2026-02-01' },
    { label: 'Database Passwords', algorithm: 'bcrypt (cost 12)',status: 'enabled',  lastRotated: '2025-12-15' },
    { label: 'API Tokens',         algorithm: 'HMAC-SHA256',     status: 'enabled',  lastRotated: '2026-02-10' },
    { label: 'Backup Files',       algorithm: 'AES-256-CBC',     status: 'disabled', lastRotated: 'Never'      },
  ];

  // ── Lifecycle ──
  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // ── Actions ──
  setTab(k: string): void { this.activeTab = k; }

  addIPRule(): void {
    if (!this.newIP.ip.trim()) return;
    this.ipRules.push({
      id: Date.now(), ...this.newIP,
      addedDate: new Date().toISOString().slice(0, 10), active: true
    });
    this.showIPModal = false;
    this.newIP = { ip: '', label: '', type: 'whitelist' };
  }

  removeIPRule(rule: IPRule): void {
    this.ipRules = this.ipRules.filter(r => r.id !== rule.id);
  }

  revokeKey(k: ApiKey): void { k.active = false; }

  terminateSession(s: SessionEntry): void { s.active = false; }

  terminateAllSuspicious(): void {
    this.sessions.filter(s => s.suspicious).forEach(s => s.active = false);
  }

  openGDPRModal(r: GDPRRequest): void {
    this.selectedGDPR = { ...r };
    this.showGDPRModal = true;
  }
  approveGDPR(): void {
    if (!this.selectedGDPR) return;
    const r = this.gdprRequests.find(x => x.id === this.selectedGDPR!.id);
    if (r) r.status = 'completed';
    this.showGDPRModal = false;
  }
  rejectGDPR(): void {
    if (!this.selectedGDPR) return;
    const r = this.gdprRequests.find(x => x.id === this.selectedGDPR!.id);
    if (r) r.status = 'rejected';
    this.showGDPRModal = false;
  }

  closeModals(): void {
    this.showIPModal = this.showKeyModal = this.showGDPRModal = false;
  }

  // ── Helpers ──
  getLogStatusClass(s: string): string {
    return s === 'success' ? 'ls-success' : s === 'failed' ? 'ls-failed' : 'ls-blocked';
  }
  getGDPRStatusClass(s: string): string {
    return s === 'completed' ? 'gs-done' : s === 'pending' ? 'gs-pending' : 'gs-rejected';
  }
  getRiskClass(r: string): string {
    return r === 'High' ? 'risk-high' : r === 'Medium' ? 'risk-med' : 'risk-low';
  }
  getEncClass(s: string): string {
    return s === 'enabled' ? 'enc-on' : 'enc-off';
  }

  get activeSessions(): number   { return this.sessions.filter(s => s.active).length; }
  get suspiciousSessions(): number { return this.sessions.filter(s => s.suspicious && s.active).length; }
  get pendingGDPR(): number       { return this.gdprRequests.filter(r => r.status === 'pending').length; }
  get activeKeys(): number        { return this.apiKeys.filter(k => k.active).length; }
  get whitelistCount(): number {
  return this.ipRules.filter(r => r.type === 'whitelist').length;
}

get blacklistCount(): number {
  return this.ipRules.filter(r => r.type === 'blacklist').length;
}
}
