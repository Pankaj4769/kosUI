import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface RestaurantConfig {
  taxRate: number;   // percentage, e.g. 5 = 5%
  currency: string;
}

const STORAGE_KEY = 'restaurant_config';
const DEFAULTS: RestaurantConfig = { taxRate: 5, currency: '₹' };

@Injectable({ providedIn: 'root' })
export class RestaurantConfigService {

  private configSubject = new BehaviorSubject<RestaurantConfig>(this.load());
  config$ = this.configSubject.asObservable();

  get taxRate(): number {
    return this.configSubject.value.taxRate;
  }

  get currency(): string {
    return this.configSubject.value.currency;
  }

  setTaxRate(rate: number): void {
    this.patch({ taxRate: Math.max(0, Math.min(100, rate)) });
  }

  private patch(changes: Partial<RestaurantConfig>): void {
    const updated = { ...this.configSubject.value, ...changes };
    this.configSubject.next(updated);
    this.save(updated);
  }

  private load(): RestaurantConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private save(config: RestaurantConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}
  }
}
