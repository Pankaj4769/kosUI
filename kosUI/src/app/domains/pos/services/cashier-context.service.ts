// src/app/core/services/cashier-context.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CashierContext {
  tableName:   string;
  orderType:   string;
  orderNumber: string;
}

@Injectable({ providedIn: 'root' })
export class CashierContextService {
  private _ctx$ = new BehaviorSubject<CashierContext | null>(null);
  readonly context$ = this._ctx$.asObservable();

  set(ctx: CashierContext | null): void { this._ctx$.next(ctx); }
  clear(): void                         { this._ctx$.next(null); }
}
