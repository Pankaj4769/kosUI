import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { BASE_URL } from '../../apiUrls';

export interface TableSession {
  sessionId:    string;
  tableId:      number;
  tableName:    string;
  waiterName?:  string;
  /** ACTIVE | BILLING | CLOSED */
  status:       'ACTIVE' | 'BILLING' | 'CLOSED';
  /** Next KOT round number to assign (1-based, owned by backend) */
  kotRound:     number;
  restaurantId: string;
  openedAt:     string;
}

const LS_PREFIX = 'tbl_session_';

/**
 * Cache-first session service.
 *
 * Why backend (not just BehaviorSubject):
 *   Multi-restaurant SaaS — waiter tablet and cashier POS are separate browsers
 *   with separate Angular instances and separate BehaviorSubjects. Without a
 *   shared DB record, each device generates its own sessionId, so waiter orders
 *   and cashier orders never join and the bill is always wrong.
 *
 * DB hit policy (one hit per session per device, then never again):
 *   1. In-memory BehaviorSubject cache hit  → return instantly, zero network
 *   2. localStorage cache hit               → restore + return, zero network
 *   3. No cache (new device / new session)  → ONE DB call, then cached forever
 *
 *   nextKot / setBilling / close write to DB in the background (fire-and-forget)
 *   so the UI is never blocked waiting for a response.
 */
@Injectable({ providedIn: 'root' })
export class TableSessionService {

  private sessionsMap     = new Map<number, TableSession>();
  private sessionsSubject = new BehaviorSubject<Map<number, TableSession>>(this.sessionsMap);
  public  sessions$: Observable<Map<number, TableSession>> = this.sessionsSubject.asObservable();

  private readonly api = `${BASE_URL}/sessions`;

  constructor(private http: HttpClient) {
    this.restoreFromStorage();
  }

  // ── Primary API ────────────────────────────────────────

  /**
   * Cache-first get-or-create.
   *
   * ① In-memory hit  → of(cached)   — synchronous, zero network
   * ② localStorage   → of(restored) — synchronous, zero network
   * ③ Cache miss     → HTTP POST /sessions/get-or-create — ONE DB call
   *
   * Because ① and ② return of(), subscribing in a component is always safe —
   * the callback fires synchronously on cache hits and async only on first open.
   */
  getOrCreate(
    tableId: number,
    tableName: string,
    restaurantId: string,
    waiterName?: string
  ): Observable<TableSession> {

    // ① in-memory cache
    const inMemory = this.sessionsMap.get(tableId);
    if (inMemory?.status === 'ACTIVE') {
      // Update waiterName in background if it changed
      if (waiterName && waiterName !== inMemory.waiterName) {
        this.cache({ ...inMemory, waiterName });
      }
      return of(this.sessionsMap.get(tableId)!);
    }

    // ② localStorage cache
    const fromStorage = this.readFromStorage(tableId);
    if (fromStorage?.status === 'ACTIVE') {
      this.cache(fromStorage);
      return of(fromStorage);
    }

    // ③ DB call — only reaches here on first open from a new device / new session
    return this.http.post<TableSession>(`${this.api}/get-or-create`, {
      tableId,
      tableName,
      waiterName: waiterName ?? null,
      restaurantId,
    }).pipe(
      tap(session => this.cache(session)),
      catchError(err => {
        console.warn('[TableSessionService] Backend unreachable, creating local session', err);
        return of(this.createLocalFallback(tableId, tableName, restaurantId, waiterName));
      })
    );
  }

  /**
   * Synchronous read from in-memory cache.
   * Always valid after getOrCreate() has resolved for this tableId.
   */
  getCached(tableId: number): TableSession | null {
    return this.sessionsMap.get(tableId) ?? null;
  }

  /**
   * Consume the current KOT round and return it, then increment.
   * Optimistic local update + background DB sync (non-blocking).
   */
  nextKot(tableId: number): number {
    const session = this.sessionsMap.get(tableId);
    if (!session) return 1;
    const round = session.kotRound;
    this.cache({ ...session, kotRound: round + 1 });
    // Fire-and-forget — UI never waits for this
    this.http.post<{ kotRound: number }>(`${this.api}/${session.sessionId}/next-kot`, {})
      .subscribe({ error: e => console.warn('[TableSessionService] nextKot sync failed', e) });
    return round;
  }

  /** Mark BILLING locally + background DB sync. */
  setBilling(tableId: number): void {
    const session = this.sessionsMap.get(tableId);
    if (!session) return;
    this.cache({ ...session, status: 'BILLING' });
    this.http.patch(`${this.api}/${session.sessionId}/bill-request`, {})
      .subscribe({ error: e => console.warn('[TableSessionService] setBilling sync failed', e) });
  }

  /** Close session locally + background DB sync. */
  close(tableId: number): void {
    const session = this.sessionsMap.get(tableId);
    if (!session) return;
    try {
      localStorage.setItem(`${LS_PREFIX}archive_${session.sessionId}`, JSON.stringify(session));
      localStorage.removeItem(`${LS_PREFIX}${session.tableId}`);
    } catch {}
    this.sessionsMap.delete(tableId);
    this.sessionsSubject.next(new Map(this.sessionsMap));
    this.http.patch(`${this.api}/${session.sessionId}/close`, {})
      .subscribe({ error: e => console.warn('[TableSessionService] close sync failed', e) });
  }

  /** Cart localStorage key, isolated per session. */
  cartKey(tableId: number): string {
    const s = this.sessionsMap.get(tableId);
    return s ? `cart_${s.sessionId}` : `cart_table_${tableId}`;
  }

  getSession$(tableId: number): Observable<TableSession | null> {
    return this.sessions$.pipe(map(m => m.get(tableId) ?? null));
  }

  // ── Private ────────────────────────────────────────────

  private cache(session: TableSession): void {
    this.sessionsMap.set(session.tableId, session);
    try { localStorage.setItem(`${LS_PREFIX}${session.tableId}`, JSON.stringify(session)); } catch {}
    this.sessionsSubject.next(new Map(this.sessionsMap));
  }

  private readFromStorage(tableId: number): TableSession | null {
    try {
      const raw = localStorage.getItem(`${LS_PREFIX}${tableId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private createLocalFallback(
    tableId: number, tableName: string,
    restaurantId: string, waiterName?: string
  ): TableSession {
    const s: TableSession = {
      sessionId:    `SES-${tableId}-${Date.now()}`,
      tableId, tableName, waiterName,
      status:       'ACTIVE',
      kotRound:     1,
      restaurantId,
      openedAt:     new Date().toISOString(),
    };
    this.cache(s);
    return s;
  }

  private restoreFromStorage(): void {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(LS_PREFIX) || key.includes('archive')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const session: TableSession = JSON.parse(raw);
        if (session.status === 'ACTIVE' || session.status === 'BILLING') {
          this.sessionsMap.set(session.tableId, session);
        }
      }
    } catch {}
    this.sessionsSubject.next(new Map(this.sessionsMap));
  }
}
