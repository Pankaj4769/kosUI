import { Injectable } from '@angular/core';
import { CartService } from '../services/cart.service';
import { TableService } from '../services/table.service';
import { HoldService } from '../services/hold.service';
import { CartItem } from '../models/cart-item.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PosFacade {

  cart$: Observable<CartItem[]>;

  constructor(
    private cartService: CartService,
    private tableService: TableService,
    private holdService: HoldService
  ) {
    this.cart$ = this.cartService.cart$;
  }

  addItem(item: CartItem) {
    this.cartService.addItem(item);
  }

  loadTable(tableNo: number) {
    return this.tableService.getOrderForTable(tableNo);
  }

  holdOrder(tableNo: number | null, cart: CartItem[]) {
    if (tableNo) {
      this.holdService.holdForTable(tableNo, cart);
    } else {
      this.holdService.holdGlobal(cart);
    }
  }

  clearTable(tableNo: number) {
    this.tableService.clearTable(tableNo);
    this.holdService.clearTableHold(tableNo);
  }
}
