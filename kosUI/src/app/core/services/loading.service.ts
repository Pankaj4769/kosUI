import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingService {

  private activeRequests = 0;
  private loading$ = new BehaviorSubject<boolean>(false);

  /** Observable — emits only when the boolean value actually changes */
  isLoading$: Observable<boolean> = this.loading$.pipe(distinctUntilChanged());

  start(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.loading$.next(true);
    }
  }

  stop(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }
    if (this.activeRequests === 0) {
      this.loading$.next(false);
    }
  }

  /** Force-reset in case of unhandled errors leaving the counter stuck */
  reset(): void {
    this.activeRequests = 0;
    this.loading$.next(false);
  }
}
