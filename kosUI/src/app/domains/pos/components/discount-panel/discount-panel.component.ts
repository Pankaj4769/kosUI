import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DiscountService } from '../../services/discount.service';

@Component({
  selector: 'app-discount-panel',
  templateUrl: './discount-panel.component.html',
  styleUrls: ['./discount-panel.component.css']
})
export class DiscountPanelComponent {

  @Input() cart: any[] = [];
  @Output() discountApplied = new EventEmitter<any>();

  itemType = 'PERCENT';
  itemValue = 0;

  billType = 'PERCENT';
  billValue = 0;

  couponCode = '';

  constructor(private discountService: DiscountService) {}

  applyItem() {
    this.cart.forEach(item => {
      item.price = this.discountService.applyItemDiscount(
        item.price,
        this.itemType,
        this.itemValue
      );
    });

    this.discountApplied.emit();
  }

  applyBill() {
    this.discountApplied.emit({
      type: this.billType,
      value: this.billValue
    });
  }

  applyCoupon() {
    const discount = this.discountService.validateCoupon(this.couponCode);

    if (discount > 0) {
      this.discountApplied.emit({
        type: 'PERCENT',
        value: discount
      });
    } else {
      alert('Invalid Coupon');
    }
  }
}
