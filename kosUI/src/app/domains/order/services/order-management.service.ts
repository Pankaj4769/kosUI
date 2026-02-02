import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { Order, OrderStatus, OrderType, OrderPriority } from '../models/order.model';

/**
 * Unified service managing both live orders and order history
 * This is the single source of truth for all order data
 */
@Injectable({
  providedIn: 'root'
})
export class OrderManagementService {

  // Separate subjects for live orders and history
  private readonly liveOrdersSubject = new BehaviorSubject<Order[]>([]);
  private readonly historyOrdersSubject = new BehaviorSubject<Order[]>([]);

  // Public observables
  public readonly liveOrders$: Observable<Order[]> = this.liveOrdersSubject.asObservable().pipe(
    shareReplay(1)
  );

  public readonly historyOrders$: Observable<Order[]> = this.historyOrdersSubject.asObservable().pipe(
    shareReplay(1)
  );

  // Combined observable - all orders (live + history)
  public readonly allOrders$: Observable<Order[]> = combineLatest([
    this.liveOrders$,
    this.historyOrders$
  ]).pipe(
    map(([liveOrders, historyOrders]) => {
      // Merge and sort by date (newest first)
      return [...liveOrders, ...historyOrders].sort((a, b) => 
        b.orderTime.getTime() - a.orderTime.getTime()
      );
    }),
    shareReplay(1)
  );

  // Active orders (not completed or cancelled)
  public readonly activeOrders$: Observable<Order[]> = this.liveOrders$.pipe(
    map(orders => orders.filter(order => 
      order.status !== OrderStatus.SERVED && 
      order.status !== OrderStatus.CANCELLED
    ))
  );

  // Completed orders (served or cancelled)
  public readonly completedOrders$: Observable<Order[]> = combineLatest([
    this.liveOrders$,
    this.historyOrders$
  ]).pipe(
    map(([liveOrders, historyOrders]) => {
      const completed = [...liveOrders, ...historyOrders].filter(order =>
        order.status === OrderStatus.SERVED || 
        order.status === OrderStatus.CANCELLED
      );
      return completed.sort((a, b) => 
        b.orderTime.getTime() - a.orderTime.getTime()
      );
    }),
    shareReplay(1)
  );

  constructor() {
    this.initializeData();
  }

  /**
   * Initialize with mock data
   */
  private initializeData(): void {
    // Generate live orders (active orders)
    const liveOrders = this.generateMockOrders(10, true);
    this.liveOrdersSubject.next(liveOrders);

    // Generate historical orders (completed)
    const historyOrders = this.generateMockOrders(50, false);
    this.historyOrdersSubject.next(historyOrders);
  }

  /**
   * Get all orders (live + history)
   */
  getAllOrders(): Order[] {
    return [
      ...this.liveOrdersSubject.getValue(),
      ...this.historyOrdersSubject.getValue()
    ];
  }

  /**
   * Get live orders only
   */
  getLiveOrders(): Order[] {
    return this.liveOrdersSubject.getValue();
  }

  /**
   * Get history orders only
   */
  getHistoryOrders(): Order[] {
    return this.historyOrdersSubject.getValue();
  }

  /**
   * Add a new order (goes to live orders)
   */
  addOrder(order: Order): void {
    const currentLiveOrders = this.getLiveOrders();
    this.liveOrdersSubject.next([...currentLiveOrders, order]);
  }

  /**
   * Update an order
   * Automatically moves to history if status is SERVED or CANCELLED
   */
  updateOrder(orderId: number, updates: Partial<Order>): void {
    const liveOrders = this.getLiveOrders();
    const historyOrders = this.getHistoryOrders();

    // Check if order is in live orders
    const liveOrderIndex = liveOrders.findIndex(o => o.id === orderId);
    
    if (liveOrderIndex !== -1) {
      const updatedOrder = { ...liveOrders[liveOrderIndex], ...updates };
      
      // Check if order should move to history
      if (updatedOrder.status === OrderStatus.SERVED || 
          updatedOrder.status === OrderStatus.CANCELLED) {
        // Remove from live orders
        const newLiveOrders = liveOrders.filter(o => o.id !== orderId);
        this.liveOrdersSubject.next(newLiveOrders);
        
        // Add to history orders
        this.historyOrdersSubject.next([updatedOrder, ...historyOrders]);
      } else {
        // Keep in live orders
        const newLiveOrders = [...liveOrders];
        newLiveOrders[liveOrderIndex] = updatedOrder;
        this.liveOrdersSubject.next(newLiveOrders);
      }
    } else {
      // Update in history orders
      const updatedHistoryOrders = historyOrders.map(order =>
        order.id === orderId ? { ...order, ...updates } : order
      );
      this.historyOrdersSubject.next(updatedHistoryOrders);
    }
  }

  /**
   * Delete an order
   */
  deleteOrder(orderId: number): void {
    const liveOrders = this.getLiveOrders().filter(o => o.id !== orderId);
    const historyOrders = this.getHistoryOrders().filter(o => o.id !== orderId);
    
    this.liveOrdersSubject.next(liveOrders);
    this.historyOrdersSubject.next(historyOrders);
  }

  /**
   * Move order from live to history manually
   */
  moveToHistory(orderId: number): void {
    const liveOrders = this.getLiveOrders();
    const order = liveOrders.find(o => o.id === orderId);
    
    if (order) {
      const newLiveOrders = liveOrders.filter(o => o.id !== orderId);
      this.liveOrdersSubject.next(newLiveOrders);
      
      const historyOrders = this.getHistoryOrders();
      this.historyOrdersSubject.next([order, ...historyOrders]);
    }
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: OrderStatus): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(order => order.status === status))
    );
  }

  /**
   * Get orders by type
   */
  getOrdersByType(type: OrderType): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(order => order.type === type))
    );
  }

  /**
   * Get orders within date range
   */
  getOrdersByDateRange(startDate: Date, endDate: Date): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(order => 
        order.orderTime >= startDate && order.orderTime <= endDate
      ))
    );
  }

  /**
   * Search orders across all orders
   */
  searchOrders(searchText: string): Observable<Order[]> {
    const search = searchText.toLowerCase().trim();
    
    if (!search) {
      return this.allOrders$;
    }

    return this.allOrders$.pipe(
      map(orders => orders.filter(order =>
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.tableName?.toLowerCase().includes(search) ||
        order.waiterName?.toLowerCase().includes(search)
      ))
    );
  }

  /**
   * Calculate statistics for given orders
   */
  calculateStatistics(orders: Order[]): {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    completedOrders: number;
  } {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const completedOrders = orders.filter(
      order => order.status === OrderStatus.SERVED
    ).length;

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      completedOrders
    };
  }

  /**
   * Refresh all orders
   */
  refreshAllOrders(): void {
    const liveOrders = this.generateMockOrders(10, true);
    const historyOrders = this.generateMockOrders(50, false);
    
    this.liveOrdersSubject.next(liveOrders);
    this.historyOrdersSubject.next(historyOrders);
  }

  /**
   * Get orders by priority
   * @param priority The priority level to filter by
   */
  getOrdersByPriority(priority: OrderPriority): Observable<Order[]> {
    return this.allOrders$.pipe(
      map(orders => orders.filter(order => order.priority === priority))
    );
  }

  /**
   * Sort orders by priority (highest to lowest)
   * Works with any enum format (string or numeric)
   */
  sortOrdersByPriority(orders: Order[]): Order[] {
    // Get all enum values
    const priorityValues = Object.values(OrderPriority);
    
    // Create priority map dynamically
    const priorityMap = new Map<OrderPriority, number>();
    priorityValues.forEach((value, index) => {
      priorityMap.set(value as OrderPriority, index);
    });
    
    return [...orders].sort((a, b) => {
      const priorityA = priorityMap.get(a.priority) ?? 999;
      const priorityB = priorityMap.get(b.priority) ?? 999;
      return priorityA - priorityB;
    });
  }

  /**
   * Update order status
   * @param orderId The ID of the order
   * @param status The new status
   */
  updateOrderStatus(orderId: number, status: OrderStatus): void {
    this.updateOrder(orderId, { status });
  }

  /**
   * Update order priority
   * @param orderId The ID of the order
   * @param priority The new priority
   */
  updateOrderPriority(orderId: number, priority: OrderPriority): void {
    this.updateOrder(orderId, { priority });
  }

  /**
   * Export orders to CSV format
   * @param orders Array of orders to export
   */
  exportOrdersToCSV(orders: Order[]): string {
    const headers = [
      'Order Number',
      'Date',
      'Time',
      'Customer',
      'Table',
      'Type',
      'Items',
      'Amount',
      'Status',
      'Waiter',
      'Priority'
    ];
    
    const rows = orders.map(order => [
      order.orderNumber,
      new Date(order.orderTime).toLocaleDateString(),
      new Date(order.orderTime).toLocaleTimeString(),
      order.customerName || '',
      order.tableName || '',
      order.type,
      order.items.length.toString(),
      order.totalAmount.toString(),
      order.status,
      order.waiterName || '',
      order.priority
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  /**
   * Generate mock orders
   * @param count Number of orders to generate
   * @param isLive Whether orders should be live (active) or historical (completed)
   */
  private generateMockOrders(count: number, isLive: boolean): Order[] {
    const mockOrders: Order[] = [];
    const now = new Date();
    
    const types = [OrderType.DINE_IN, OrderType.TAKEAWAY, OrderType.DELIVERY];
    
    // Status based on whether it's live or historical
    const statuses = isLive 
      ? [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]
      : [OrderStatus.SERVED, OrderStatus.CANCELLED];
    
    // ✅ Get all available priority values from the enum
    const allPriorities = Object.values(OrderPriority) as OrderPriority[];
    
    // ✅ Try to identify priority levels (works with any naming convention)
    const urgentPriority = allPriorities[0] || allPriorities[allPriorities.length - 1];
    const highPriority = allPriorities[1] || allPriorities[allPriorities.length - 2];
    const normalPriority = allPriorities[2] || allPriorities[Math.floor(allPriorities.length / 2)];
    const lowPriority = allPriorities[allPriorities.length - 1] || allPriorities[0];
    
    for (let i = 1; i <= count; i++) {
      const daysAgo = isLive ? 0 : Math.floor(Math.random() * 30);
      const orderTime = new Date(now);
      orderTime.setDate(orderTime.getDate() - daysAgo);
      orderTime.setHours(Math.floor(Math.random() * 12) + 8);
      orderTime.setMinutes(Math.floor(Math.random() * 60));

      const itemCount = Math.floor(Math.random() * 5) + 1;
      const items = Array.from({ length: itemCount }, (_, idx) => ({
        id: idx + 1,
        name: `Item ${idx + 1}`,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: Math.floor(Math.random() * 500) + 100,
        notes: ''
      }));

      const totalAmount = items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      const selectedType = types[Math.floor(Math.random() * types.length)];
      const selectedStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      // ✅ Assign priority based on order status and type
      let priority: OrderPriority;
      if (isLive && selectedStatus === OrderStatus.PENDING && selectedType === OrderType.DELIVERY) {
        priority = urgentPriority;
      } else if (isLive && selectedStatus === OrderStatus.PREPARING) {
        priority = highPriority;
      } else if (isLive && selectedStatus === OrderStatus.READY) {
        priority = normalPriority;
      } else {
        // Random priority
        priority = allPriorities[Math.floor(Math.random() * allPriorities.length)];
      }

      const baseId = isLive ? 1000 : 1;

      mockOrders.push({
        id: baseId + i,
        orderNumber: `ORD${String(baseId + i).padStart(5, '0')}`,
        orderTime,
        type: selectedType,
        status: selectedStatus,
        items,
        totalAmount,
        customerName: `Customer ${baseId + i}`,
        tableName: `Table ${Math.floor(Math.random() * 20) + 1}`,
        waiterName: `Waiter ${Math.floor(Math.random() * 10) + 1}`,
        notes: '',
        priority
      });
    }

    return mockOrders.sort((a, b) => 
      b.orderTime.getTime() - a.orderTime.getTime()
    );
  }

  /**
   * Clear all orders (use with caution)
   */
  clearAllOrders(): void {
    this.liveOrdersSubject.next([]);
    this.historyOrdersSubject.next([]);
  }

  /**
   * Bulk update orders
   * @param orderIds Array of order IDs to update
   * @param updates Partial order updates to apply
   */
  bulkUpdateOrders(orderIds: number[], updates: Partial<Order>): void {
    const liveOrders = this.getLiveOrders();
    const historyOrders = this.getHistoryOrders();
    
    const updatedLiveOrders = liveOrders.map(order =>
      orderIds.includes(order.id) ? { ...order, ...updates } : order
    );
    
    const updatedHistoryOrders = historyOrders.map(order =>
      orderIds.includes(order.id) ? { ...order, ...updates } : order
    );
    
    this.liveOrdersSubject.next(updatedLiveOrders);
    this.historyOrdersSubject.next(updatedHistoryOrders);
  }

  /**
   * Get orders summary grouped by status
   */
  getOrdersSummaryByStatus(): Observable<Map<OrderStatus, number>> {
    return this.allOrders$.pipe(
      map(orders => {
        const summary = new Map<OrderStatus, number>();
        
        // Initialize all statuses with 0
        Object.values(OrderStatus).forEach(status => {
          summary.set(status as OrderStatus, 0);
        });

        // Count orders by status
        orders.forEach(order => {
          const count = summary.get(order.status) || 0;
          summary.set(order.status, count + 1);
        });

        return summary;
      })
    );
  }

  /**
   * Get revenue by order type
   */
  getRevenueByType(): Observable<Map<OrderType, number>> {
    return this.allOrders$.pipe(
      map(orders => {
        const revenueMap = new Map<OrderType, number>();
        
        // Initialize all types with 0
        Object.values(OrderType).forEach(type => {
          revenueMap.set(type as OrderType, 0);
        });

        // Sum revenue by type
        orders.forEach(order => {
          const currentRevenue = revenueMap.get(order.type) || 0;
          revenueMap.set(order.type, currentRevenue + order.totalAmount);
        });

        return revenueMap;
      })
    );
  }

  /**
   * Get order by ID
   * @param orderId The ID of the order to retrieve
   */
  getOrderById(orderId: number): Observable<Order | undefined> {
    return this.allOrders$.pipe(
      map(orders => orders.find(order => order.id === orderId))
    );
  }
}
