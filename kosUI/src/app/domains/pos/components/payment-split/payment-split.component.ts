import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';

type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'Wallet';

interface SplitPayment {
  mode: PaymentMode;
  amount: number;
}

@Component({
  selector: 'app-payment-split',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-split.component.html',
  styleUrls: ['./payment-split.component.css']
})
export class PaymentSplitComponent implements OnChanges {

  /* ================= INPUT / OUTPUT ================= */

  @Input() total = 0;
  @Output() completed = new EventEmitter<SplitPayment[]>();

  /* ================= STATE ================= */

  payments: SplitPayment[] = [
    { mode: 'Cash', amount: 0 }
  ];

  balance = 0;

  readonly modes: PaymentMode[] = [
    'Cash',
    'Card',
    'UPI',
    'Wallet'
  ];

  constructor(private paymentService: PaymentService) {}

  /* ================= LIFECYCLE ================= */

  ngOnChanges(_: SimpleChanges) {
    this.recalculateBalance();
  }

  /* ================= ROWS ================= */

  addRow() {
    this.payments = [
      ...this.payments,
      { mode: 'Cash', amount: 0 }
    ];
    this.recalculateBalance();
  }

  removeRow(index: number) {
    this.payments = this.payments.filter((_, i) => i !== index);
    this.recalculateBalance();
  }

  /* ================= SPLIT ================= */

  equalSplit() {
    const count = this.payments.length;
    if (count === 0) return;

    const base = Math.floor(this.total / count);
    const remainder = this.total - base * count;

    this.payments = this.payments.map((p, i) => ({
      ...p,
      amount: i === 0 ? base + remainder : base
    }));

    this.recalculateBalance();
  }

  /* ================= VALIDATION ================= */

  recalculateBalance() {
    this.balance =
      this.paymentService.getBalance(this.total, this.payments);
  }

  finalize() {
    if (!this.paymentService.validateSplit(this.total, this.payments)) {
      alert('Split amount must match total bill!');
      return;
    }

    this.completed.emit(this.payments);
  }

  trackByIndex(index: number) {
    return index;
  }
}
