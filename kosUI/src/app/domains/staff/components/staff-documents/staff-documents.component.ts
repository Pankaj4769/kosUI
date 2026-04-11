import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { StaffService, StaffMember } from '../../services/staff.service';
import { AuthService } from '../../../../core/auth/auth.service';

export type DocType =
  | 'ID_PROOF'
  | 'CONTRACT'
  | 'FOOD_HANDLER'
  | 'HEALTH_CARD'
  | 'POLICE_CLEARANCE'
  | 'TRAINING_CERT'
  | 'OTHER';

export type DocStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';

export interface StaffDocument {
  id: string;
  staffId: string;
  type: DocType;
  label: string;
  fileName: string;
  uploadedDate: Date;
  expiryDate?: Date;
  status: DocStatus;
  notes?: string;
}

const DOC_TYPE_META: Record<DocType, { label: string; icon: string; requiresExpiry: boolean }> = {
  ID_PROOF:        { label: 'ID Proof',            icon: 'id',       requiresExpiry: false },
  CONTRACT:        { label: 'Employment Contract',  icon: 'contract', requiresExpiry: true  },
  FOOD_HANDLER:    { label: 'Food Handler Cert',    icon: 'cert',     requiresExpiry: true  },
  HEALTH_CARD:     { label: 'Health Card',          icon: 'health',   requiresExpiry: true  },
  POLICE_CLEARANCE:{ label: 'Police Clearance',     icon: 'police',   requiresExpiry: true  },
  TRAINING_CERT:   { label: 'Training Certificate', icon: 'training', requiresExpiry: true  },
  OTHER:           { label: 'Other',                icon: 'file',     requiresExpiry: false }
};

const EXPIRY_WARN_DAYS = 30;

@Component({
  selector: 'app-staff-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-documents.component.html',
  styleUrls: ['./staff-documents.component.css']
})
export class StaffDocumentsComponent implements OnInit, OnDestroy {

  staffMembers: StaffMember[] = [];
  documents: StaffDocument[] = [];

  // Filters
  selectedStaffId = 'ALL';
  selectedStatus: DocStatus | 'ALL' = 'ALL';
  searchQuery = '';

  // Upload modal
  isUploadOpen = false;
  uploadForm: {
    staffId: string;
    type: DocType;
    label: string;
    expiryDate: string;
    notes: string;
    fileName: string;
  } = this.emptyForm();

  // Preview modal
  previewDoc: StaffDocument | null = null;

  // Delete
  deletingDoc: StaffDocument | null = null;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: any;

  readonly DOC_TYPE_META = DOC_TYPE_META;
  readonly DOC_TYPES = Object.keys(DOC_TYPE_META) as DocType[];

  private destroy$ = new Subject<void>();

  constructor(
    private staffSvc: StaffService,
    private authSvc: AuthService
  ) {}

  ngOnInit(): void {
    const restaurantId = this.authSvc.currentUser?.restaurantId ?? '';
    if (restaurantId) this.staffSvc.loadStaff(restaurantId);

    this.staffSvc.staff$.pipe(takeUntil(this.destroy$)).subscribe(members => {
      this.staffMembers = members;
    });

    this.documents = this.getSampleDocuments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.toastTimer);
  }

  // ─── Filters ──────────────────────────────────────────────────────

  get filteredDocuments(): StaffDocument[] {
    return this.documents.filter(doc => {
      if (this.selectedStaffId !== 'ALL' && doc.staffId !== this.selectedStaffId) return false;
      if (this.selectedStatus !== 'ALL' && doc.status !== this.selectedStatus) return false;
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const staff = this.getStaffName(doc.staffId).toLowerCase();
        if (!doc.label.toLowerCase().includes(q) && !staff.includes(q)) return false;
      }
      return true;
    });
  }

  // ─── KPI Counts ───────────────────────────────────────────────────

  countByStatus(status: DocStatus | 'ALL'): number {
    if (status === 'ALL') return this.documents.length;
    return this.documents.filter(d => d.status === status).length;
  }

  staffWithMissingDocs(): number {
    const staffWithDoc = new Set(this.documents.map(d => d.staffId));
    return this.staffMembers.filter(m => !staffWithDoc.has(m.id)).length;
  }

  // ─── Upload Modal ─────────────────────────────────────────────────

  openUpload(staffId?: string): void {
    this.uploadForm = this.emptyForm();
    if (staffId) this.uploadForm.staffId = staffId;
    this.isUploadOpen = true;
  }

  closeUpload(): void {
    this.isUploadOpen = false;
    this.uploadForm = this.emptyForm();
  }

  onBackdropClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closeUpload();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.uploadForm.fileName = input.files[0].name;
  }

  get uploadTypeRequiresExpiry(): boolean {
    return DOC_TYPE_META[this.uploadForm.type]?.requiresExpiry ?? false;
  }

  saveDocument(): void {
    if (!this.uploadForm.staffId || !this.uploadForm.type || !this.uploadForm.label) return;

    const expiryDate = this.uploadForm.expiryDate ? new Date(this.uploadForm.expiryDate) : undefined;

    const doc: StaffDocument = {
      id: `DOC-${Date.now()}`,
      staffId: this.uploadForm.staffId,
      type: this.uploadForm.type,
      label: this.uploadForm.label || DOC_TYPE_META[this.uploadForm.type].label,
      fileName: this.uploadForm.fileName || 'document.pdf',
      uploadedDate: new Date(),
      expiryDate,
      status: this.computeStatus(expiryDate),
      notes: this.uploadForm.notes
    };

    this.documents = [doc, ...this.documents];
    this.closeUpload();
    this.showToast('Document uploaded successfully!', 'success');
  }

  // ─── Preview ──────────────────────────────────────────────────────

  openPreview(doc: StaffDocument): void { this.previewDoc = doc; }
  closePreview(): void { this.previewDoc = null; }

  // ─── Delete ───────────────────────────────────────────────────────

  confirmDelete(doc: StaffDocument): void { this.deletingDoc = doc; }

  executeDelete(): void {
    if (!this.deletingDoc) return;
    this.documents = this.documents.filter(d => d.id !== this.deletingDoc!.id);
    this.deletingDoc = null;
    this.showToast('Document deleted.', 'success');
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  getStaffName(staffId: string): string {
    return this.staffMembers.find(m => m.id === staffId)?.name ?? staffId;
  }

  getStaffInitial(staffId: string): string {
    return (this.staffMembers.find(m => m.id === staffId)?.name ?? '?').charAt(0).toUpperCase();
  }

  getStaffPosition(staffId: string): string {
    const m = this.staffMembers.find(m => m.id === staffId);
    return m?.position ?? m?.roleName ?? '';
  }

  getAvatarColor(name: string): string {
    const palette = ['#16a34a','#2563eb','#0f766e','#d97706','#4f46e5','#dc2626','#7c3aed'];
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return palette[h % palette.length];
  }

  daysUntilExpiry(doc: StaffDocument): number | null {
    if (!doc.expiryDate) return null;
    return Math.ceil((doc.expiryDate.getTime() - Date.now()) / 86400000);
  }

  formatDate(d?: Date): string {
    if (!d) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  statusLabel(status: DocStatus): string {
    return { VALID: 'Valid', EXPIRING_SOON: 'Expiring Soon', EXPIRED: 'Expired', MISSING: 'Missing' }[status];
  }

  private computeStatus(expiry?: Date): DocStatus {
    if (!expiry) return 'VALID';
    const days = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
    if (days < 0) return 'EXPIRED';
    if (days <= EXPIRY_WARN_DAYS) return 'EXPIRING_SOON';
    return 'VALID';
  }

  private emptyForm() {
    return { staffId: '', type: 'ID_PROOF' as DocType, label: '', expiryDate: '', notes: '', fileName: '' };
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => { this.toast = null; }, 3000);
  }

  // ─── Per-staff document summary ───────────────────────────────────

  getDocumentsForStaff(staffId: string): StaffDocument[] {
    return this.documents.filter(d => d.staffId === staffId);
  }

  getWorstStatusForStaff(staffId: string): DocStatus | null {
    const docs = this.getDocumentsForStaff(staffId);
    if (docs.some(d => d.status === 'EXPIRED')) return 'EXPIRED';
    if (docs.some(d => d.status === 'EXPIRING_SOON')) return 'EXPIRING_SOON';
    if (docs.length === 0) return 'MISSING';
    return 'VALID';
  }

  // ─── Sample data ──────────────────────────────────────────────────

  private getSampleDocuments(): StaffDocument[] {
    const now = new Date();
    const days = (n: number) => new Date(now.getTime() + n * 86400000);

    return [
      { id: 'DOC-001', staffId: 'STF-01', type: 'ID_PROOF',     label: 'Aadhar Card',           fileName: 'aadhar_alice.pdf',     uploadedDate: days(-60),  status: 'VALID' },
      { id: 'DOC-002', staffId: 'STF-01', type: 'CONTRACT',     label: 'Employment Contract',    fileName: 'contract_alice.pdf',   uploadedDate: days(-180), expiryDate: days(200),  status: 'VALID' },
      { id: 'DOC-003', staffId: 'STF-01', type: 'FOOD_HANDLER', label: 'Food Handler Cert',      fileName: 'fhc_alice.pdf',        uploadedDate: days(-300), expiryDate: days(20),   status: 'EXPIRING_SOON' },
      { id: 'DOC-004', staffId: 'STF-02', type: 'ID_PROOF',     label: 'Passport',               fileName: 'passport_bob.pdf',     uploadedDate: days(-90),  status: 'VALID' },
      { id: 'DOC-005', staffId: 'STF-02', type: 'HEALTH_CARD',  label: 'Medical Fitness',        fileName: 'health_bob.pdf',       uploadedDate: days(-400), expiryDate: days(-10),  status: 'EXPIRED' },
      { id: 'DOC-006', staffId: 'STF-02', type: 'FOOD_HANDLER', label: 'Food Handler Cert',      fileName: 'fhc_bob.pdf',          uploadedDate: days(-100), expiryDate: days(120),  status: 'VALID' },
      { id: 'DOC-007', staffId: 'STF-03', type: 'CONTRACT',     label: 'Part-time Contract',     fileName: 'contract_charlie.pdf', uploadedDate: days(-30),  expiryDate: days(335),  status: 'VALID' },
      { id: 'DOC-008', staffId: 'STF-03', type: 'POLICE_CLEARANCE', label: 'Police Clearance',   fileName: 'police_charlie.pdf',   uploadedDate: days(-365), expiryDate: days(25),   status: 'EXPIRING_SOON' },
    ];
  }
}
