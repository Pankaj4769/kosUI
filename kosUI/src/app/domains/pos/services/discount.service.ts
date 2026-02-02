import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DiscountService {

  applyBillDiscount(total: number, type: string, value: number) {

    if (type === 'PERCENT') {
      return total - (total * value / 100);
    }

    if (type === 'FLAT') {
      return total - value;
    }

    return total;
  }

  applyItemDiscount(price: number, type: string, value: number) {

    if (type === 'PERCENT') {
      return price - (price * value / 100);
    }

    if (type === 'FLAT') {
      return price - value;
    }

    return price;
  }

  validateCoupon(code: string): number {

    // Example coupons – later replace with API
    const coupons: any = {
      SAVE10: 10,
      FOOD5: 5
    };

    return coupons[code] || 0;
  }
}
