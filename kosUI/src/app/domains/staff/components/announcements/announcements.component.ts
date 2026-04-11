import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

/* ── Types ─────────────────────────────────────────────────────────── */
export type AnnouncementCategory = 'GENERAL' | 'POLICY' | 'EVENT' | 'URGENT' | 'HOLIDAY' | 'TRAINING';
export type AnnouncementStatus   = 'ACTIVE' | 'DRAFT' | 'SCHEDULED' | 'ARCHIVED';
export type AudienceTarget       = 'ALL' | 'KITCHEN' | 'CASHIER' | 'WAITER' | 'MANAGER';

export interface Announcement {
  id:          string;
  title:       string;
  body:        string;
  category:    AnnouncementCategory;
  status:      AnnouncementStatus;
  audience:    AudienceTarget[];
  pinned:      boolean;
  publishedAt: Date;
  scheduledAt?: Date;
  expiresAt?:  Date;
  createdBy:   string;
  readBy:      string[];   // staffIds who have read
  totalStaff:  number;
}

/* ── Metadata maps ─────────────────────────────────────────────────── */
export const CATEGORY_META: Record<AnnouncementCategory, { label: string; icon: string; colorClass: string }> = {
  GENERAL:  { label: 'General',  icon: 'info',            colorClass: 'ann-cat--general'  },
  POLICY:   { label: 'Policy',   icon: 'policy',          colorClass: 'ann-cat--policy'   },
  EVENT:    { label: 'Event',    icon: 'celebration',     colorClass: 'ann-cat--event'    },
  URGENT:   { label: 'Urgent',   icon: 'priority_high',   colorClass: 'ann-cat--urgent'   },
  HOLIDAY:  { label: 'Holiday',  icon: 'beach_access',    colorClass: 'ann-cat--holiday'  },
  TRAINING: { label: 'Training', icon: 'school',          colorClass: 'ann-cat--training' }
};

export const AUDIENCE_META: Record<AudienceTarget, { label: string; icon: string }> = {
  ALL:     { label: 'All Staff', icon: 'groups'         },
  KITCHEN: { label: 'Kitchen',   icon: 'soup_kitchen'   },
  CASHIER: { label: 'Cashier',   icon: 'point_of_sale'  },
  WAITER:  { label: 'Waiter',    icon: 'room_service'   },
  MANAGER: { label: 'Manager',   icon: 'manage_accounts'}
};

/* ── Sample data ───────────────────────────────────────────────────── */
const SAMPLE: Announcement[] = [
  {
    id: 'ann-001', title: 'Monthly Staff Meeting – April 2026',
    body: 'All staff are required to attend the monthly meeting on 15th April at 10:00 AM in the main hall. Attendance is mandatory. Please ensure your shift is covered.',
    category: 'EVENT', status: 'ACTIVE', audience: ['ALL'], pinned: true,
    publishedAt: new Date('2026-04-08'), createdBy: 'Manager', readBy: ['s1', 's2'], totalStaff: 18
  },
  {
    id: 'ann-002', title: 'Updated Hygiene & Food Safety Policy',
    body: 'Please review the updated food safety SOPs shared via email. The new policy is effective from 1st May. Training sessions will be held next week.',
    category: 'POLICY', status: 'ACTIVE', audience: ['ALL'], pinned: true,
    publishedAt: new Date('2026-04-07'), createdBy: 'Manager', readBy: ['s1'], totalStaff: 18
  },
  {
    id: 'ann-003', title: 'Kitchen Equipment Maintenance – Tonight',
    body: 'The grills and fryers will be taken offline tonight from 11 PM to 2 AM for scheduled maintenance. Adjust prep schedules accordingly.',
    category: 'URGENT', status: 'ACTIVE', audience: ['KITCHEN'], pinned: false,
    publishedAt: new Date('2026-04-10'), createdBy: 'Manager', readBy: [], totalStaff: 6
  },
  {
    id: 'ann-004', title: 'New POS Update – Training Required',
    body: 'The POS system is being updated to v2.3 this weekend. Cashiers are required to complete the 20-minute training module before Monday.',
    category: 'TRAINING', status: 'ACTIVE', audience: ['CASHIER', 'MANAGER'], pinned: false,
    publishedAt: new Date('2026-04-09'), createdBy: 'Admin', readBy: ['s3'], totalStaff: 5
  },
  {
    id: 'ann-005', title: 'Eid Holiday Schedule',
    body: 'The restaurant will operate with reduced hours on Eid (30th April). Only essential staff on rostered shifts are required. Volunteers for double shifts will receive bonus pay.',
    category: 'HOLIDAY', status: 'SCHEDULED', audience: ['ALL'], pinned: false,
    publishedAt: new Date('2026-04-10'),
    scheduledAt: new Date('2026-04-25'),
    createdBy: 'Manager', readBy: [], totalStaff: 18
  },
  {
    id: 'ann-006', title: 'Dress Code Reminder',
    body: 'All customer-facing staff must wear the updated uniform from next Monday. Hair must be tied. Name badges are mandatory at all times.',
    category: 'GENERAL', status: 'ACTIVE', audience: ['WAITER', 'CASHIER'], pinned: false,
    publishedAt: new Date('2026-04-05'), createdBy: 'Manager', readBy: ['s4', 's5', 's6'], totalStaff: 9
  },
  {
    id: 'ann-007', title: 'Weekend Incentive Program',
    body: '[DRAFT] Proposing a weekend sales incentive — top 3 cashiers by upsell revenue will receive a bonus. Under review by management.',
    category: 'GENERAL', status: 'DRAFT', audience: ['CASHIER'], pinned: false,
    publishedAt: new Date('2026-04-10'), createdBy: 'Manager', readBy: [], totalStaff: 5
  }
];

/* ── Component ─────────────────────────────────────────────────────── */
@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './announcements.component.html',
  styleUrls: ['./announcements.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnouncementsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  /* ── Data ── */
  announcements: Announcement[] = [...SAMPLE];

  /* ── Filter state ── */
  searchQuery    = '';
  filterCategory: AnnouncementCategory | 'ALL' = 'ALL';
  filterStatus:   AnnouncementStatus   | 'ALL' = 'ALL';
  filterAudience: AudienceTarget       | 'ALL' = 'ALL';
  viewMode: 'cards' | 'list' = 'cards';

  /* ── Modal state ── */
  showCompose   = false;
  showDetail: Announcement | null = null;
  showDeleteConfirm: Announcement | null = null;
  toastMsg  = '';
  toastType: 'success' | 'error' = 'success';
  toastVisible = false;

  /* ── Compose form ── */
  draft: Partial<Announcement> & { audienceStr: AudienceTarget[] } = this.emptyDraft();

  /* ── Exposed metadata for template ── */
  readonly categoryMeta   = CATEGORY_META;
  readonly audienceMeta   = AUDIENCE_META;
  readonly categories: AnnouncementCategory[]  = ['GENERAL', 'POLICY', 'EVENT', 'URGENT', 'HOLIDAY', 'TRAINING'];
  readonly statuses:   AnnouncementStatus[]    = ['ACTIVE', 'DRAFT', 'SCHEDULED', 'ARCHIVED'];
  readonly audiences:  AudienceTarget[]        = ['ALL', 'KITCHEN', 'CASHIER', 'WAITER', 'MANAGER'];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── KPI counts ─────────────────────────────────────── */
  get totalCount():     number { return this.announcements.length; }
  get activeCount():    number { return this.announcements.filter(a => a.status === 'ACTIVE').length; }
  get pinnedCount():    number { return this.announcements.filter(a => a.pinned).length; }
  get scheduledCount(): number { return this.announcements.filter(a => a.status === 'SCHEDULED').length; }
  get draftCount():     number { return this.announcements.filter(a => a.status === 'DRAFT').length; }

  /* ── Filtered list ──────────────────────────────────── */
  get filtered(): Announcement[] {
    return this.announcements
      .filter(a => {
        const q = this.searchQuery.toLowerCase();
        const matchSearch = !q ||
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q);

        const matchCat      = this.filterCategory === 'ALL' || a.category === this.filterCategory;
        const matchStatus   = this.filterStatus   === 'ALL' || a.status   === this.filterStatus;
        const matchAudience = this.filterAudience === 'ALL' ||
          a.audience.includes('ALL') ||
          a.audience.includes(this.filterAudience as AudienceTarget);

        return matchSearch && matchCat && matchStatus && matchAudience;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (a.category === 'URGENT' && b.category !== 'URGENT') return -1;
        return b.publishedAt.getTime() - a.publishedAt.getTime();
      });
  }

  get pinnedItems(): Announcement[] {
    return this.filtered.filter(a => a.pinned);
  }

  get unpinnedItems(): Announcement[] {
    return this.filtered.filter(a => !a.pinned);
  }

  /* ── Read rate helper ── */
  readRate(a: Announcement): number {
    if (!a.totalStaff) return 0;
    return Math.round((a.readBy.length / a.totalStaff) * 100);
  }

  /* ── Toggle pin ── */
  togglePin(a: Announcement): void {
    a.pinned = !a.pinned;
    this.showToast(a.pinned ? 'Announcement pinned' : 'Announcement unpinned', 'success');
    this.cdr.markForCheck();
  }

  /* ── Archive ── */
  archiveAnnouncement(a: Announcement): void {
    a.status = 'ARCHIVED';
    this.showDetail = null;
    this.showToast('Announcement archived', 'success');
    this.cdr.markForCheck();
  }

  /* ── Delete ── */
  confirmDelete(a: Announcement): void {
    this.showDeleteConfirm = a;
    this.showDetail = null;
    this.cdr.markForCheck();
  }

  executeDelete(): void {
    if (!this.showDeleteConfirm) return;
    this.announcements = this.announcements.filter(a => a.id !== this.showDeleteConfirm!.id);
    this.showDeleteConfirm = null;
    this.showToast('Announcement deleted', 'success');
    this.cdr.markForCheck();
  }

  /* ── Compose / Save ── */
  openCompose(existing?: Announcement): void {
    this.draft = existing
      ? { ...existing, audienceStr: [...existing.audience] }
      : this.emptyDraft();
    this.showCompose = true;
    this.cdr.markForCheck();
  }

  toggleAudience(target: AudienceTarget): void {
    const idx = this.draft.audienceStr!.indexOf(target);
    if (target === 'ALL') {
      this.draft.audienceStr = ['ALL'];
    } else {
      // Remove ALL if specific role chosen
      this.draft.audienceStr = this.draft.audienceStr!.filter(a => a !== 'ALL');
      if (idx >= 0) {
        this.draft.audienceStr.splice(idx, 1);
        if (!this.draft.audienceStr.length) this.draft.audienceStr = ['ALL'];
      } else {
        this.draft.audienceStr.push(target);
      }
    }
    this.cdr.markForCheck();
  }

  isAudienceSelected(target: AudienceTarget): boolean {
    return this.draft.audienceStr?.includes(target) ?? false;
  }

  saveAnnouncement(): void {
    if (!this.draft.title?.trim() || !this.draft.body?.trim()) {
      this.showToast('Title and body are required', 'error');
      return;
    }

    const existing = this.announcements.find(a => a.id === this.draft.id);
    if (existing) {
      Object.assign(existing, {
        title:    this.draft.title,
        body:     this.draft.body,
        category: this.draft.category,
        status:   this.draft.status,
        audience: this.draft.audienceStr,
        pinned:   this.draft.pinned,
        scheduledAt: this.draft.scheduledAt,
        expiresAt:   this.draft.expiresAt
      });
      this.showToast('Announcement updated', 'success');
    } else {
      const newAnn: Announcement = {
        id:          `ann-${Date.now()}`,
        title:       this.draft.title!,
        body:        this.draft.body!,
        category:    this.draft.category ?? 'GENERAL',
        status:      this.draft.status ?? 'ACTIVE',
        audience:    this.draft.audienceStr!.length ? this.draft.audienceStr! : ['ALL'],
        pinned:      this.draft.pinned ?? false,
        publishedAt: new Date(),
        scheduledAt: this.draft.scheduledAt,
        expiresAt:   this.draft.expiresAt,
        createdBy:   'Manager',
        readBy:      [],
        totalStaff:  18
      };
      this.announcements = [newAnn, ...this.announcements];
      this.showToast('Announcement published', 'success');
    }

    this.showCompose = false;
    this.cdr.markForCheck();
  }

  /* ── Detail view ── */
  openDetail(a: Announcement): void {
    this.showDetail = a;
    this.cdr.markForCheck();
  }

  /* ── Apply KPI filter ── */
  applyKpiFilter(status: AnnouncementStatus | 'ALL'): void {
    this.filterStatus = status;
    this.cdr.markForCheck();
  }

  /* ── Toast ── */
  showToast(msg: string, type: 'success' | 'error' = 'success'): void {
    this.toastMsg  = msg;
    this.toastType = type;
    this.toastVisible = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.toastVisible = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  /* ── Typed metadata helpers (required for strict template checking) ── */
  getCatMeta(cat: AnnouncementCategory) { return CATEGORY_META[cat]; }
  getAudMeta(aud: AudienceTarget)       { return AUDIENCE_META[aud]; }

  trackById(_: number, a: Announcement): string { return a.id; }

  private emptyDraft(): Partial<Announcement> & { audienceStr: AudienceTarget[] } {
    return {
      title: '', body: '', category: 'GENERAL',
      status: 'ACTIVE', pinned: false, audienceStr: ['ALL']
    };
  }
}
