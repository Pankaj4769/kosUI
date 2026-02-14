import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

// Models
import { CartItem } from '../../models/cart-item.model';
import { ConfirmDialogComponent } from '../../../common-popup/pages/confirm-dialog.component'; // Import your confirm dialog
import { MatDialog } from '@angular/material/dialog';
/* ================= TYPES ================= */

export type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';

export interface CustomerInfo {
  name: string;
  phone: string;
  address?: string;
  email?: string;
}

export interface PaymentData {
  method: PaymentMethod;
  amount: number;
  tip?: number;
  discount?: number;
  splitCount?: number;
  transactionId?: string;
  timestamp: Date;
}

export interface SplitPayment {
  personIndex: number;
  amount: number;
  method: PaymentMethod;
  paid: boolean;
}

/* ================= COMPONENT ================= */

@Component({
  selector: 'app-payment-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatRadioModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './payment-popup.component.html',
  styleUrls: ['./payment-popup.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentPopupComponent implements OnInit {

  /* ================= INPUTS ================= */

  @Input() total: number = 0;
  @Input() subtotal: number = 0;
  @Input() tax: number = 0;
  @Input() discount: number = 0;
  @Input() cart: CartItem[] = [];
  @Input() orderType: OrderType = 'Dine-In';
  @Input() tableNumber: number | null = null;
  @Input() customerInfo: CustomerInfo | null = null;
  @Input() orderNumber: string = '';

  /* ================= OUTPUTS ================= */

  @Output() close = new EventEmitter<void>();
  @Output() complete = new EventEmitter<PaymentData>();

  /* ================= STATE - PAYMENT METHOD ================= */

  selectedMethod: PaymentMethod = 'cash';
  
  // Cash Payment
  cashReceived: number = 0;
  
  // Card Payment
  cardNumber: string = '';
  cardHolderName: string = '';
  
  // UPI Payment
  upiId: string = '';
  upiProvider: 'gpay' | 'phonepe' | 'paytm' | 'bhim' = 'gpay';
  
  /* ================= STATE - TIP & DISCOUNT ================= */

  tipAmount: number = 0;
  tipPercentage: number = 0;
  customDiscount: number = 0;
  discountType: 'percentage' | 'fixed' = 'percentage';
  discountReason: string = '';
  
  /* ================= STATE - SPLIT BILL ================= */

  splitEnabled = false;
  splitCount = 2;
  splitPayments: SplitPayment[] = [];
  
  /* ================= STATE - UI ================= */

  processing = false;
  showBillDetails = true;
  printAfterPayment = true;
  sendSMS = false;
  
  /* ================= QUICK OPTIONS ================= */

  quickTipOptions = [0, 5, 10, 15, 20];
  quickDiscountOptions = [5, 10, 15, 20, 25];

  /* ================= CONSTRUCTOR ================= */

  constructor(
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog // Injected MatDialog service
  ) {}

  /* ================= LIFECYCLE ================= */

  ngOnInit(): void {
    this.initializePayment();
  }

  /* ================= INITIALIZATION ================= */

  private initializePayment(): void {
    this.cashReceived = Math.ceil(this.finalTotal / 100) * 100;
    this.cdr.markForCheck();
  }

  /* ================= COMPUTED PROPERTIES ================= */

  get tipTotal(): number {
    return this.tipAmount;
  }

  get discountTotal(): number {
    return this.customDiscount + this.discount;
  }

  get finalTotal(): number {
    return Math.max(0, this.total + this.tipTotal - this.customDiscount);
  }

  get changeAmount(): number {
    if (this.selectedMethod !== 'cash') return 0;
    return Math.max(0, this.cashReceived - this.finalTotal);
  }

  get splitAmountPerPerson(): number {
    if (!this.splitEnabled || this.splitCount <= 1) return this.finalTotal;
    return this.finalTotal / this.splitCount;
  }

  get canProceed(): boolean {
    if (this.processing) return false;

    if (this.splitEnabled) {
      return this.splitPayments.every(p => p.paid);
    }

    switch (this.selectedMethod) {
      case 'cash':
        return this.cashReceived >= this.finalTotal;
      case 'card':
        return this.cardNumber.length >= 16 && this.cardHolderName.trim().length > 0;
      case 'upi':
        return this.upiId.trim().length > 0;
      case 'wallet':
        return true;
      default:
        return false;
    }
  }

  /* ================= PAYMENT METHOD SELECTION ================= */

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedMethod = method;
    this.cdr.markForCheck();
  }

  /* ================= TIP MANAGEMENT ================= */

  applyQuickTip(percentage: number): void {
    this.tipPercentage = percentage;
    this.tipAmount = Math.round((this.subtotal * percentage) / 100);
    this.cdr.markForCheck();
  }

  updateCustomTip(amount: number): void {
    this.tipAmount = Math.max(0, amount);
    this.tipPercentage = this.subtotal > 0 
      ? Math.round((this.tipAmount / this.subtotal) * 100) 
      : 0;
    this.cdr.markForCheck();
  }

  clearTip(): void {
    this.tipAmount = 0;
    this.tipPercentage = 0;
    this.cdr.markForCheck();
  }

  /* ================= DISCOUNT MANAGEMENT ================= */

  applyQuickDiscount(percentage: number): void {
    this.discountType = 'percentage';
    this.customDiscount = Math.round((this.subtotal * percentage) / 100);
    this.cdr.markForCheck();
  }

  updateCustomDiscount(value: number): void {
    if (this.discountType === 'percentage') {
      this.customDiscount = Math.round((this.subtotal * value) / 100);
    } else {
      this.customDiscount = Math.max(0, value);
    }
    this.cdr.markForCheck();
  }

  clearDiscount(): void {
    this.customDiscount = 0;
    this.discountReason = '';
    this.cdr.markForCheck();
  }

  getDiscountPercentage(): number {
    if (this.subtotal <= 0) return 0;
    return Math.round((this.customDiscount / this.subtotal) * 100);
  }

  /* ================= SPLIT BILL ================= */

  toggleSplitBill(): void {
    this.splitEnabled = !this.splitEnabled;
    
    if (this.splitEnabled) {
      this.initializeSplitPayments();
    } else {
      this.splitPayments = [];
    }
    
    this.cdr.markForCheck();
  }

  updateSplitCount(count: number): void {
    this.splitCount = Math.max(2, Math.min(10, count));
    this.initializeSplitPayments();
    this.cdr.markForCheck();
  }

  private initializeSplitPayments(): void {
    this.splitPayments = Array.from({ length: this.splitCount }, (_, i) => ({
      personIndex: i + 1,
      amount: this.splitAmountPerPerson,
      method: 'cash',
      paid: false
    }));
  }

  markSplitPaymentPaid(index: number, method: PaymentMethod): void {
    if (this.splitPayments[index]) {
      this.splitPayments[index].paid = true;
      this.splitPayments[index].method = method;
      this.cdr.markForCheck();
    }
  }

  /* ================= CASH PAYMENT ================= */

  updateCashReceived(amount: number): void {
    this.cashReceived = Math.max(0, amount);
    this.cdr.markForCheck();
  }

  addQuickCash(amount: number): void {
    this.cashReceived += amount;
    this.cdr.markForCheck();
  }

  setExactAmount(): void {
    this.cashReceived = this.finalTotal;
    this.cdr.markForCheck();
  }

  /* ================= PAYMENT PROCESSING ================= */

  async processPayment(): Promise<void> {
    if (!this.canProceed) return;

    this.processing = true;
    this.cdr.markForCheck();

    try {
      await this.delay(1500);

      const paymentData: PaymentData = {
        method: this.selectedMethod,
        amount: this.finalTotal,
        tip: this.tipAmount,
        discount: this.discountTotal,
        splitCount: this.splitEnabled ? this.splitCount : undefined,
        transactionId: this.generateTransactionId(),
        timestamp: new Date()
      };

      if (this.printAfterPayment) {
        this.printReceipt();
      }

      if (this.sendSMS && this.customerInfo?.phone) {
        this.sendPaymentSMS();
      }

      this.complete.emit(paymentData);
    } catch (err) {
      console.error('Payment processing failed:', err);
      alert('Payment failed. Please try again.');
    } finally {
      this.processing = false;
      this.cdr.markForCheck();
    }
  }

  private generateTransactionId(): string {
    return `TXN${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ================= RECEIPT & PRINTING ================= */

  printReceipt(): void {
    console.log('Printing receipt...');
    console.log('Order:', this.orderNumber);
    console.log('Items:', this.cart);
    console.log('Total:', this.finalTotal);
  }

  private sendPaymentSMS(): void {
    console.log('Sending SMS to:', this.customerInfo?.phone);
  }

  viewReceipt(): void {
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(this.generateReceiptHTML());
      receiptWindow.document.close();
    }
  }

  private generateReceiptHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${this.orderNumber}</title>
        <style>
          body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
          h1 { text-align: center; font-size: 18px; }
          .divider { border-top: 2px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>RESTAURANT NAME</h1>
        <div class="divider"></div>
        <div class="row"><span>Order #:</span><span>${this.orderNumber}</span></div>
        <div class="row"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
        ${this.tableNumber ? `<div class="row"><span>Table:</span><span>${this.tableNumber}</span></div>` : ''}
        <div class="divider"></div>
        ${this.cart.map(item => `
          <div class="row">
            <span>${item.name} x${item.qty}</span>
            <span>₹${item.price * item.qty}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div class="row"><span>Subtotal:</span><span>₹${this.subtotal}</span></div>
        <div class="row"><span>Tax:</span><span>₹${this.tax}</span></div>
        ${this.tipAmount > 0 ? `<div class="row"><span>Tip:</span><span>₹${this.tipAmount}</span></div>` : ''}
        ${this.discountTotal > 0 ? `<div class="row"><span>Discount:</span><span>-₹${this.discountTotal}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row total"><span>TOTAL:</span><span>₹${this.finalTotal}</span></div>
        <div class="row"><span>Payment:</span><span>${this.selectedMethod.toUpperCase()}</span></div>
        ${this.selectedMethod === 'cash' ? `
          <div class="row"><span>Cash Received:</span><span>₹${this.cashReceived}</span></div>
          <div class="row"><span>Change:</span><span>₹${this.changeAmount}</span></div>
        ` : ''}
        <div class="divider"></div>
        <p style="text-align: center; margin-top: 20px;">Thank You! Visit Again</p>
      </body>
      </html>
    `;
  }

  /* ================= CLOSE ================= */

  onClose(): void {
    if (this.processing) return;

    // UPDATED: Using ConfirmDialog instead of window.confirm
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Payment?',
        message: 'Are you sure you want to cancel the payment process and go back? All entered data will be lost.',
        confirmText: 'Yes, Cancel',
        cancelText: 'No, Stay',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.close.emit();
      }
    });
    
    // if (confirm('Cancel payment and go back?')) {
    //   this.close.emit();
    // }
  }

  /* ================= HELPERS ================= */

  formatCurrency(amount: number): string {
    return `₹${amount.toFixed(0)}`;
  }

  getPaymentMethodIcon(method: PaymentMethod): string {
    switch (method) {
      case 'cash': return 'payments';
      case 'card': return 'credit_card';
      case 'upi': return 'qr_code_scanner';
      case 'wallet': return 'account_balance_wallet';
      default: return 'payment';
    }
  }

  getUpiProviderIcon(provider: string): string {
    switch (provider) {
      case 'gpay': return '💰';
      case 'phonepe': return '📱';
      case 'paytm': return '💳';
      case 'bhim': return '🏦';
      default: return '💵';
    }
  }
}
