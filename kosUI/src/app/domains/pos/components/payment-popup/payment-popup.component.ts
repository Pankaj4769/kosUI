import {
  Component, Input, Output, EventEmitter,
  OnInit, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { CartItem } from '../../models/cart-item.model';
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component';


/* ── Types ─────────────────────────────────────────── */
export type OrderType      = 'Dine-In' | 'Takeaway' | 'Delivery';
export type PaymentMethod  = 'cash' | 'card' | 'upi' | 'wallet';
export type PaymentMode    = 'full' | 'split' | 'part';

export interface CustomerInfo {
  name: string; phone: string; address?: string; email?: string;
}

export interface PaymentData {
  method: PaymentMethod;
  mode: PaymentMode;
  amount: number;
  tip?: number;
  discount?: number;
  splitCount?: number;
  partPayments?: PartPaymentEntry[];
  transactionId?: string;
  timestamp: Date;
}

export interface SplitPayment {
  personIndex: number; amount: number; method: PaymentMethod; paid: boolean;
}

export interface PartPaymentEntry {
  index: number; amount: number; method: PaymentMethod;
  note?: string; timestamp: Date;
}


/* ── Component ─────────────────────────────────────── */
@Component({
  selector: 'app-payment-popup',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatRadioModule,
    MatCheckboxModule, MatTooltipModule, MatDividerModule
  ],
  templateUrl: './payment-popup.component.html',
  styleUrls: ['./payment-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentPopupComponent implements OnInit {

  /* ── Inputs ───────────────────────────────────────── */
  @Input() total       = 0;
  @Input() subtotal    = 0;
  @Input() tax         = 0;
  @Input() discount    = 0;
  @Input() cart: CartItem[] = [];
  @Input() orderType: OrderType = 'Dine-In';
  @Input() tableNumber: number | null = null;
  @Input() customerInfo: CustomerInfo | null = null;
  @Input() orderNumber = '';

  /* ── Outputs ──────────────────────────────────────── */
  @Output() close    = new EventEmitter<void>();
  @Output() complete = new EventEmitter<PaymentData>();

  /* ── Payment method & mode ────────────────────────── */
  selectedMethod: PaymentMethod = 'cash';
  paymentMode: PaymentMode = 'full';

  // Cash
  cashReceived = 0;

  // Card
  cardNumber      = '';
  cardHolderName  = '';

  // UPI
  upiId       = '';
  upiProvider: 'gpay' | 'phonepe' | 'paytm' | 'bhim' = 'gpay';

  /* ── Tip & Discount ───────────────────────────────── */
  tipAmount       = 0;
  tipPercentage   = 0;
  customDiscount  = 0;
  discountType: 'percentage' | 'fixed' = 'percentage';
  discountReason  = '';

  /* ── Split ────────────────────────────────────────── */
  splitCount    = 2;
  splitPayments: SplitPayment[] = [];

  /* ── Part Payment ─────────────────────────────────── */
  partPayments: PartPaymentEntry[] = [];
  partEntryAmount = 0;
  partEntryMethod: PaymentMethod = 'cash';
  partEntryNote   = '';

  /* ── UI state ─────────────────────────────────────── */
  processing       = false;
  showBillDetails  = true;
  printAfterPayment = true;
  sendSMS          = false;

  /* ── Quick options ────────────────────────────────── */
  readonly quickTipOptions      = [0, 5, 10, 15, 20];
  readonly quickDiscountOptions = [5, 10, 15, 20, 25];
  readonly quickCashOptions     = [100, 200, 500];
  readonly methods: PaymentMethod[] = ['cash', 'card', 'upi', 'wallet'];

  constructor(private cdr: ChangeDetectorRef, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.cashReceived   = Math.ceil(this.finalTotal / 100) * 100;
    this.partEntryAmount = this.finalTotal;
  }

  /* ── Computed ─────────────────────────────────────── */
  get finalTotal(): number {
    return Math.max(0, this.total + this.tipAmount - this.customDiscount);
  }

  get discountTotal(): number { return this.customDiscount + this.discount; }

  get changeAmount(): number {
    return this.selectedMethod === 'cash'
      ? Math.max(0, this.cashReceived - this.finalTotal) : 0;
  }

  get splitAmountPerPerson(): number {
    return this.splitCount > 1 ? this.finalTotal / this.splitCount : this.finalTotal;
  }

  get partPaidTotal(): number {
    return this.partPayments.reduce((s, p) => s + p.amount, 0);
  }

  get partRemainingTotal(): number {
    return Math.max(0, this.finalTotal - this.partPaidTotal);
  }

  get partFullyPaid(): boolean { return this.partRemainingTotal <= 0; }

  get canProceed(): boolean {
    if (this.processing) return false;
    if (this.paymentMode === 'split') return this.splitPayments.every(p => p.paid);
    if (this.paymentMode === 'part')  return this.partFullyPaid;
    switch (this.selectedMethod) {
      case 'cash':   return this.cashReceived >= this.finalTotal;
      case 'card':   return this.cardNumber.length >= 16 && !!this.cardHolderName.trim();
      case 'upi':    return !!this.upiId.trim();
      case 'wallet': return true;
      default:       return false;
    }
  }

  /* ── Mode toggle ──────────────────────────────────── */
  setMode(mode: PaymentMode): void {
    this.paymentMode = mode;
    if (mode === 'split') this.initSplitPayments();
    else if (mode === 'part') {
      this.partPayments    = [];
      this.partEntryAmount = this.finalTotal;
    }
    this.mark();
  }

  /* ── Method selection ─────────────────────────────── */
  selectMethod(m: PaymentMethod): void { this.selectedMethod = m; this.mark(); }

  /* ── Tip ──────────────────────────────────────────── */
  applyTip(pct: number): void {
    this.tipPercentage = pct;
    this.tipAmount     = Math.round((this.subtotal * pct) / 100);
    this.mark();
  }

  updateTip(v: number): void {
    this.tipAmount     = Math.max(0, v);
    this.tipPercentage = this.subtotal > 0
      ? Math.round((this.tipAmount / this.subtotal) * 100) : 0;
    this.mark();
  }

  clearTip(): void { this.tipAmount = 0; this.tipPercentage = 0; this.mark(); }

  /* ── Discount ─────────────────────────────────────── */
  applyDiscount(pct: number): void {
    this.discountType   = 'percentage';
    this.customDiscount = Math.round((this.subtotal * pct) / 100);
    this.mark();
  }

  updateDiscount(v: number): void {
    this.customDiscount = this.discountType === 'percentage'
      ? Math.round((this.subtotal * v) / 100) : Math.max(0, v);
    this.mark();
  }

  clearDiscount(): void { this.customDiscount = 0; this.discountReason = ''; this.mark(); }

  getDiscountPct(): number {
    return this.subtotal > 0
      ? Math.round((this.customDiscount / this.subtotal) * 100) : 0;
  }

  /* ── Split ────────────────────────────────────────── */
  updateSplitCount(n: number): void {
    this.splitCount = Math.max(2, Math.min(10, n));
    this.initSplitPayments();
    this.mark();
  }

  private initSplitPayments(): void {
    this.splitPayments = Array.from({ length: this.splitCount }, (_, i) => ({
      personIndex: i + 1, amount: this.splitAmountPerPerson,
      method: 'cash', paid: false
    }));
  }

  markSplitPaid(i: number, m: PaymentMethod): void {
    if (this.splitPayments[i]) {
      this.splitPayments[i].paid = true;
      this.splitPayments[i].method = m;
      this.mark();
    }
  }

  /* ── Part Payment ─────────────────────────────────── */
  addPartPayment(): void {
    const amt = Math.min(this.partEntryAmount, this.partRemainingTotal);
    if (amt <= 0) return;
    this.partPayments.push({
      index:     this.partPayments.length + 1,
      amount:    amt,
      method:    this.partEntryMethod,
      note:      this.partEntryNote.trim() || undefined,
      timestamp: new Date()
    });
    this.partEntryAmount = this.partRemainingTotal - amt;
    this.partEntryNote   = '';
    this.mark();
  }

  removePartPayment(i: number): void {
    this.partPayments.splice(i, 1);
    this.partPayments.forEach((p, idx) => p.index = idx + 1);
    this.partEntryAmount = this.partRemainingTotal;
    this.mark();
  }

  setPartEntryToRemaining(): void {
    this.partEntryAmount = this.partRemainingTotal;
    this.mark();
  }

  /* ── Cash helpers ─────────────────────────────────── */
  setExactAmount(): void  { this.cashReceived = this.finalTotal; this.mark(); }
  addQuickCash(n: number): void { this.cashReceived += n; this.mark(); }

  /* ── Process ──────────────────────────────────────── */
  async processPayment(): Promise<void> {
    if (!this.canProceed) return;
    this.processing = true; this.mark();

    try {
      await new Promise(r => setTimeout(r, 1200));

      const data: PaymentData = {
        method:         this.selectedMethod,
        mode:           this.paymentMode,
        amount:         this.finalTotal,
        tip:            this.tipAmount || undefined,
        discount:       this.discountTotal || undefined,
        splitCount:     this.paymentMode === 'split' ? this.splitCount : undefined,
        partPayments:   this.paymentMode === 'part'  ? this.partPayments : undefined,
        transactionId:  `TXN${Date.now()}${Math.random().toString(36).slice(2,9).toUpperCase()}`,
        timestamp:      new Date()
      };

      if (this.printAfterPayment) this.printReceipt();
      if (this.sendSMS && this.customerInfo?.phone) this.sendPaymentSMS();

      this.complete.emit(data);
    } catch (e) {
      console.error(e);
    } finally {
      this.processing = false; this.mark();
    }
  }

  /* ── Receipt ──────────────────────────────────────── */
  printReceipt(): void { console.log('Print:', this.orderNumber, this.finalTotal); }

  private sendPaymentSMS(): void {
    console.log('SMS to:', this.customerInfo?.phone);
  }

  viewReceipt(): void {
    const w = window.open('', '_blank');
    if (w) { w.document.write(this.buildReceiptHTML()); w.document.close(); }
  }

  private buildReceiptHTML(): string {
    const rows = this.cart
      .map(i => `<div class="row"><span>${i.name} ×${i.qty}</span><span>₹${i.price * i.qty}</span></div>`)
      .join('');
    return `<!DOCTYPE html><html><head><title>Receipt - ${this.orderNumber}</title>
      <style>body{font-family:monospace;padding:20px;max-width:400px;margin:0 auto}
      h1{text-align:center;font-size:18px}.d{border-top:2px dashed #000;margin:10px 0}
      .row{display:flex;justify-content:space-between;margin:5px 0}
      .total{font-weight:700;font-size:16px}</style></head><body>
      <h1>RESTAURANT NAME</h1><div class="d"></div>
      <div class="row"><span>Order #:</span><span>${this.orderNumber}</span></div>
      <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
      ${this.tableNumber ? `<div class="row"><span>Table:</span><span>${this.tableNumber}</span></div>` : ''}
      <div class="d"></div>${rows}<div class="d"></div>
      <div class="row"><span>Subtotal:</span><span>₹${this.subtotal}</span></div>
      <div class="row"><span>Tax:</span><span>₹${this.tax}</span></div>
      ${this.tipAmount     ? `<div class="row"><span>Tip:</span><span>₹${this.tipAmount}</span></div>` : ''}
      ${this.discountTotal ? `<div class="row"><span>Discount:</span><span>-₹${this.discountTotal}</span></div>` : ''}
      <div class="d"></div>
      <div class="row total"><span>TOTAL:</span><span>₹${this.finalTotal}</span></div>
      ${this.paymentMode === 'part' ? this.partPayments.map(p =>
        `<div class="row"><span>Part ${p.index} (${p.method}):</span><span>₹${p.amount}</span></div>`
      ).join('') : `<div class="row"><span>Payment:</span><span>${this.selectedMethod.toUpperCase()}</span></div>`}
      ${this.selectedMethod === 'cash' && this.paymentMode === 'full' ? `
        <div class="row"><span>Cash Received:</span><span>₹${this.cashReceived}</span></div>
        <div class="row"><span>Change:</span><span>₹${this.changeAmount}</span></div>` : ''}
      <div class="d"></div>
      <p style="text-align:center;margin-top:20px">Thank You! Visit Again</p>
      </body></html>`;
  }

  /* ── Close ────────────────────────────────────────── */
  onClose(): void {
    if (this.processing) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Payment?',
        message: 'All entered data will be lost.',
        confirmText: 'Yes, Cancel',
        cancelText: 'No, Stay',
        confirmColor: 'warn'
      }
    }).afterClosed().subscribe(r => { if (r) this.close.emit(); });
  }

  /* ── Display helpers ──────────────────────────────── */
  fmt(n: number): string { return `₹${n.toFixed(0)}`; }

  methodIcon(m: PaymentMethod): string {
    return { cash: 'payments', card: 'credit_card', upi: 'qr_code_scanner', wallet: 'account_balance_wallet' }[m];
  }

  methodLabel(m: PaymentMethod): string {
    return { cash: 'Cash', card: 'Card', upi: 'UPI', wallet: 'Wallet' }[m];
  }

  upiProviderIcon(p: string): string {
    return { gpay: '💰', phonepe: '📱', paytm: '💳', bhim: '🏦' }[p] ?? '💵';
  }

  private mark(): void { this.cdr.markForCheck(); }
}
