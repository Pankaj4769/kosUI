import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, combineLatest, map, shareReplay } from 'rxjs';
import { Order, OrderStatus, OrderType, OrderPriority } from '../models/order.model';
import { BASE_URL } from '../../../apiUrls';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Unified service managing both live orders and order history.
 * Fetches from the KOS backend on init; uses optimistic local updates
 * for status changes and deletes (API call fires in background).
 * Subscribes to SSE at /order-stream for real-time push updates.
 */
@Injectable({
  providedIn: 'root'
})
export class OrderManagementService implements OnDestroy {

  // Separate subjects for live orders and history
  private readonly liveOrdersSubject    = new BehaviorSubject<Order[]>([]);
  private readonly historyOrdersSubject = new BehaviorSubject<Order[]>([]);

  /** Emits whenever an order transitions to READY (for notifications). */
  private readonly orderReadySubject = new Subject<Order>();
  public readonly orderReady$ = this.orderReadySubject.asObservable();

  /** Live READY orders (status=READY, not yet served). readyAt is set client-side on transition. */
  public readonly readyOrders$: Observable<Order[]> = this.liveOrdersSubject.asObservable().pipe(
    map(orders => orders.filter(o => o.status === OrderStatus.READY)),
    shareReplay(1)
  );

  private eventSource: EventSource | null = null;

  // Public observables
  public readonly liveOrders$: Observable<Order[]> = this.liveOrdersSubject.asObservable().pipe(
    shareReplay(1)
  );

  public readonly historyOrders$: Observable<Order[]> = this.historyOrdersSubject.asObservable().pipe(
    shareReplay(1)
  );

  // Combined observable – all orders (live + history)
  public readonly allOrders$: Observable<Order[]> = combineLatest([
    this.liveOrders$,
    this.historyOrders$
  ]).pipe(
    map(([live, history]) =>
      [...live, ...history].sort((a, b) => b.orderTime.getTime() - a.orderTime.getTime())
    ),
    shareReplay(1)
  );

  // Active orders (not completed or cancelled) — drives LiveOrdersComponent
  public readonly activeOrders$: Observable<Order[]> = this.liveOrders$.pipe(
    map(orders => orders.filter(o =>
      o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELLED
    ))
  );

  // Completed orders (served or cancelled) — drives OrderHistoryComponent
  public readonly completedOrders$: Observable<Order[]> = combineLatest([
    this.liveOrders$,
    this.historyOrders$
  ]).pipe(
    map(([live, history]) =>
      [...live, ...history]
        .filter(o => o.status === OrderStatus.SERVED || o.status === OrderStatus.CANCELLED)
        .sort((a, b) => b.orderTime.getTime() - a.orderTime.getTime())
    ),
    shareReplay(1)
  );

  private readonly baseUrl = BASE_URL;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    this.loadOrdersFromApi();
    this.connectSse();
  }

  ngOnDestroy(): void {
    this.disconnectSse();
  }

  // ─── SSE integration ────────────────────────────────────────

  /**
   * Subscribe to backend SSE stream at /order-stream.
   * Receives real-time order updates pushed by the kitchen/other clients.
   */
  private connectSse(): void {
    this.disconnectSse();

    const url = `${this.baseUrl}/order-stream`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const updatedOrder: Order = this.parseOrder(JSON.parse(event.data));
          this.handleSseOrderUpdate(updatedOrder);
        } catch (e) {
          console.warn('[SSE] Failed to parse order update:', e);
        }
      });
    };

    this.eventSource.onerror = () => {
      console.warn('[SSE] Connection lost. Reconnecting in 5s…');
      this.disconnectSse();
      setTimeout(() => this.connectSse(), 5000);
    };
  }

  private disconnectSse(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Handle an order pushed via SSE.
   * Merges it into the correct bucket and fires orderReady$ when applicable.
   */
  private handleSseOrderUpdate(order: Order): void {
    const isCompleted = order.status === OrderStatus.SERVED || order.status === OrderStatus.CANCELLED;
    const liveOrders    = this.getLiveOrders();
    const historyOrders = this.getHistoryOrders();

    // Check if this order already exists
    const liveIdx    = liveOrders.findIndex(o => o.id === order.id);
    const historyIdx = historyOrders.findIndex(o => o.id === order.id);

    // Detect READY transition — stamp readyAt and emit notification
    if (order.status === OrderStatus.READY) {
      const existing = liveIdx !== -1 ? liveOrders[liveIdx] : null;
      if (!existing || existing.status !== OrderStatus.READY) {
        order.readyAt = new Date();
        this.orderReadySubject.next(order);
      } else {
        order.readyAt = existing.readyAt; // preserve existing timestamp
      }
    }

    if (isCompleted) {
      // Remove from live, upsert in history
      if (liveIdx !== -1) {
        this.liveOrdersSubject.next(liveOrders.filter(o => o.id !== order.id));
      }
      if (historyIdx !== -1) {
        const updated = [...historyOrders];
        updated[historyIdx] = order;
        this.historyOrdersSubject.next(updated);
      } else {
        this.historyOrdersSubject.next([order, ...historyOrders]);
      }
    } else {
      // Remove from history if it was there, upsert in live
      if (historyIdx !== -1) {
        this.historyOrdersSubject.next(historyOrders.filter(o => o.id !== order.id));
      }
      if (liveIdx !== -1) {
        const updated = [...liveOrders];
        updated[liveIdx] = order;
        this.liveOrdersSubject.next(updated);
      } else {
        this.liveOrdersSubject.next([order, ...liveOrders]);
      }
    }
  }

  // ─── API calls ──────────────────────────────────────────────

  /**
   * Load all orders for the current restaurant from the backend.
   * Splits them into live vs history buckets based on status.
   */
  private loadOrdersFromApi(): void {
    const restaurantId = this.authService.currentUser?.restaurantId;
    if (!restaurantId) return;

    this.http.get<Order[]>(`${this.baseUrl}/orders?restaurantId=${restaurantId}`).subscribe({
      next: (orders) => {
        const parsed = orders.map(o => this.parseOrder(o));
        const live      = parsed.filter(o => o.status !== OrderStatus.SERVED && o.status !== OrderStatus.CANCELLED);
        const completed = parsed.filter(o => o.status === OrderStatus.SERVED  || o.status === OrderStatus.CANCELLED);
        this.liveOrdersSubject.next(live);
        this.historyOrdersSubject.next(completed);
      },
      error: (err) => console.error('[OrderManagementService] Failed to load orders:', err)
    });
  }

  /**
   * Create a new order via the backend.
   * Backend assigns id, orderNumber, status=PENDING, orderTime.
   */
  createOrder(order: Partial<Order>): void {
    const restaurantId = this.authService.currentUser?.restaurantId;
    this.http.post<Order>(`${this.baseUrl}/orders`, { ...order, restaurantId }).subscribe({
      next: (created) => {
        const parsed = this.parseOrder(created);
        this.liveOrdersSubject.next([parsed, ...this.liveOrdersSubject.getValue()]);
      },
      error: (err) => console.error('[OrderManagementService] Failed to create order:', err)
    });
  }

  // ─── State helpers ───────────────────────────────────────────

  getAllOrders(): Order[] {
    return [
      ...this.liveOrdersSubject.getValue(),
      ...this.historyOrdersSubject.getValue()
    ];
  }

  getLiveOrders(): Order[] {
    return this.liveOrdersSubject.getValue();
  }

  getHistoryOrders(): Order[] {
    return this.historyOrdersSubject.getValue();
  }

  addOrder(order: Order): void {
    this.liveOrdersSubject.next([...this.getLiveOrders(), order]);
  }

  /**
   * Optimistic-add KOT order locally for instant UI feedback,
   * then POST to backend so SSE broadcasts to all connected clients.
   * On success the backend-assigned id replaces the temp id.
   */
  sendKotOrder(order: Order): void {
    // Optimistic local add with temp id
    this.addOrder(order);

    const restaurantId = this.authService.currentUser?.restaurantId;
    this.http.post<Order>(`${this.baseUrl}/orders`, { ...order, restaurantId }).subscribe({
      next: (created) => {
        const parsed = this.parseOrder(created);
        // Replace the temp order with the backend-confirmed one
        const live = this.getLiveOrders().map(o => o.id === order.id ? parsed : o);
        this.liveOrdersSubject.next(live);
      },
      error: (err) => console.error('[OrderManagementService] KOT create failed:', err)
    });
  }

  /**
   * In-memory filter — fast but only reliable on the device that created the orders.
   * Use fetchSessionOrdersFromBackend() for billing to get ALL devices' orders.
   */
  getOrdersBySession(sessionId: string): Order[] {
    return [...this.getLiveOrders(), ...this.getHistoryOrders()]
      .filter(o => o.sessionId === sessionId);
  }

  /**
   * Fetch ALL orders for a session from the backend DB.
   * Guaranteed to include orders created by waiter AND cashier on any device.
   */
  fetchSessionOrdersFromBackend(sessionId: string): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders/by-session?sessionId=${sessionId}`)
      .pipe(map(orders => orders.map(o => this.parseOrder(o))));
  }

  /**
   * Update an order locally.
   * Automatically moves to history bucket when status becomes SERVED or CANCELLED.
   */
  updateOrder(orderId: number, updates: Partial<Order>): void {
    const liveOrders    = this.getLiveOrders();
    const historyOrders = this.getHistoryOrders();
    const liveIdx       = liveOrders.findIndex(o => o.id === orderId);

    if (liveIdx !== -1) {
      const updated = { ...liveOrders[liveIdx], ...updates };
      if (updated.status === OrderStatus.SERVED || updated.status === OrderStatus.CANCELLED) {
        this.liveOrdersSubject.next(liveOrders.filter(o => o.id !== orderId));
        this.historyOrdersSubject.next([updated, ...historyOrders]);
      } else {
        const newLive = [...liveOrders];
        newLive[liveIdx] = updated;
        this.liveOrdersSubject.next(newLive);
      }
    } else {
      this.historyOrdersSubject.next(
        historyOrders.map(o => (o.id === orderId ? { ...o, ...updates } : o))
      );
    }
  }

  /**
   * Update order status — optimistic local update + API call in background.
   */
  updateOrderStatus(orderId: number, status: OrderStatus): void {
    this.updateOrder(orderId, { status });
    this.http.patch<Order>(`${this.baseUrl}/orders/${orderId}/status`, { status }).subscribe({
      error: (err) => console.error('[OrderManagementService] Failed to update status:', err)
    });
  }

  /**
   * Update order priority locally (no API call — priority is a UI concern for now).
   */
  updateOrderPriority(orderId: number, priority: OrderPriority): void {
    this.updateOrder(orderId, { priority });
  }

  /**
   * Delete order — optimistic local removal + API call in background.
   */
  deleteOrder(orderId: number): void {
    this.liveOrdersSubject.next(this.getLiveOrders().filter(o => o.id !== orderId));
    this.historyOrdersSubject.next(this.getHistoryOrders().filter(o => o.id !== orderId));
    this.http.delete(`${this.baseUrl}/orders/${orderId}`).subscribe({
      error: (err) => console.error('[OrderManagementService] Failed to delete order:', err)
    });
  }

  moveToHistory(orderId: number): void {
    const order = this.getLiveOrders().find(o => o.id === orderId);
    if (order) {
      this.liveOrdersSubject.next(this.getLiveOrders().filter(o => o.id !== orderId));
      this.historyOrdersSubject.next([order, ...this.getHistoryOrders()]);
    }
  }

  /**
   * Re-fetch all orders from the backend.
   */
  refreshAllOrders(): void {
    this.loadOrdersFromApi();
  }

  clearAllOrders(): void {
    this.liveOrdersSubject.next([]);
    this.historyOrdersSubject.next([]);
  }

  // ─── Query helpers ───────────────────────────────────────────

  getOrdersByStatus(status: OrderStatus): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(o => o.status === status))
    );
  }

  getOrdersByType(type: OrderType): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(o => o.type === type))
    );
  }

  getOrdersByPriority(priority: OrderPriority): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(o => o.priority === priority))
    );
  }

  getOrdersByDateRange(startDate: Date, endDate: Date): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(o => o.orderTime >= startDate && o.orderTime <= endDate))
    );
  }

  searchOrders(searchText: string): Observable<Order[]> {
    const search = searchText.toLowerCase().trim();
    if (!search) return this.allOrders$;
    return this.allOrders$.pipe(
      map(orders => orders.filter(o =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName?.toLowerCase().includes(search) ||
        o.tableName?.toLowerCase().includes(search) ||
        o.waiterName?.toLowerCase().includes(search)
      ))
    );
  }

  getOrderById(orderId: number): Observable<Order | undefined> {
    return this.allOrders$.pipe(
      map(orders => orders.find(o => o.id === orderId))
    );
  }

  calculateStatistics(orders: Order[]): {
    totalOrders: number; totalRevenue: number; avgOrderValue: number; completedOrders: number;
  } {
    const totalOrders     = orders.length;
    const totalRevenue    = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const completedOrders = orders.filter(o => o.status === OrderStatus.SERVED).length;
    return {
      totalOrders, totalRevenue,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      completedOrders
    };
  }

  sortOrdersByPriority(orders: Order[]): Order[] {
    const priorityValues = Object.values(OrderPriority);
    const priorityMap    = new Map<OrderPriority, number>();
    priorityValues.forEach((v, i) => priorityMap.set(v as OrderPriority, i));
    return [...orders].sort((a, b) =>
      (priorityMap.get(a.priority) ?? 999) - (priorityMap.get(b.priority) ?? 999)
    );
  }

  bulkUpdateOrders(orderIds: number[], updates: Partial<Order>): void {
    this.liveOrdersSubject.next(
      this.getLiveOrders().map(o => (orderIds.includes(o.id) ? { ...o, ...updates } : o))
    );
    this.historyOrdersSubject.next(
      this.getHistoryOrders().map(o => (orderIds.includes(o.id) ? { ...o, ...updates } : o))
    );
  }

  getOrdersSummaryByStatus(): Observable<Map<OrderStatus, number>> {
    return this.allOrders$.pipe(
      map(orders => {
        const summary = new Map<OrderStatus, number>();
        Object.values(OrderStatus).forEach(s => summary.set(s as OrderStatus, 0));
        orders.forEach(o => summary.set(o.status, (summary.get(o.status) || 0) + 1));
        return summary;
      })
    );
  }

  getRevenueByType(): Observable<Map<OrderType, number>> {
    return this.allOrders$.pipe(
      map(orders => {
        const revenueMap = new Map<OrderType, number>();
        Object.values(OrderType).forEach(t => revenueMap.set(t as OrderType, 0));
        orders.forEach(o => revenueMap.set(o.type, (revenueMap.get(o.type) || 0) + o.totalAmount));
        return revenueMap;
      })
    );
  }

  exportOrdersToCSV(orders: Order[]): string {
    const headers = [
      'Order Number', 'Date', 'Time', 'Customer', 'Table',
      'Type', 'Items', 'Amount', 'Status', 'Waiter', 'Priority'
    ];
    const rows = orders.map(o => [
      o.orderNumber,
      new Date(o.orderTime).toLocaleDateString(),
      new Date(o.orderTime).toLocaleTimeString(),
      o.customerName || '',
      o.tableName    || '',
      o.type,
      o.items.length.toString(),
      o.totalAmount.toString(),
      o.status,
      o.waiterName || '',
      o.priority
    ]);
    return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  }

  // ─── Private helpers ─────────────────────────────────────────

  /** Convert raw API response (date strings) into an Order with real Date objects. */
  private parseOrder(raw: any): Order {
    return {
      ...raw,
      orderTime:   new Date(raw.orderTime),
      paymentDate: raw.paymentDate ? new Date(raw.paymentDate) : undefined
    };
  }
}
