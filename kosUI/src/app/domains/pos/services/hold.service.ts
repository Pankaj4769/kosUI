import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HoldService {

  private globalHolds: any[][] = [];
  private tableHolds: Record<number, any[]> = {};

  /* ================= GLOBAL HOLD ================= */

  holdGlobal(cart: any[]) {
    this.globalHolds.push([...cart]); // clone
  }

  getGlobalHolds(): any[][] {
    return [...this.globalHolds];
  }

  removeGlobalHold(index: number) {
    if (index > -1 && index < this.globalHolds.length) {
      this.globalHolds.splice(index, 1);
    }
  }

  clearGlobalHolds() {
    this.globalHolds = [];
  }

  /* ================= TABLE HOLD ================= */

  holdForTable(tableId: number, cart: any[]) {
    this.tableHolds[tableId] = [...cart];
  }

  recallForTable(tableId: number): any[] | null {
    return this.tableHolds[tableId] || null;
  }

  clearTableHold(tableId: number) {
    delete this.tableHolds[tableId];
  }
}
