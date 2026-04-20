import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';

import { OrderManagementService } from '../../../order/services/order-management.service';
import { Order, OrderStatus, OrderType } from '../../../order/models/order.model';

@Component({
  selector: 'app-kitchen-display',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './kitchen-display.component.html',
  styleUrls: ['./kitchen-display.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenDisplayComponent implements OnInit, OnDestroy {

  OrderStatus = OrderStatus;
  OrderType   = OrderType;

  pendingOrders:   Order[] = [];
  preparingOrders: Order[] = [];
  currentTime = '';

  private destroy$ = new Subject<void>();

  constructor(
    private orderMgmt: OrderManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateTime();
    interval(1000).pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.updateTime(); this.cdr.markForCheck(); });

    this.orderMgmt.activeOrders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(orders => {
        this.pendingOrders   = orders.filter(o => o.status === OrderStatus.PENDING)
          .sort((a, b) => a.orderTime.getTime() - b.orderTime.getTime());
        this.preparingOrders = orders.filter(o => o.status === OrderStatus.PREPARING)
          .sort((a, b) => a.orderTime.getTime() - b.orderTime.getTime());
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  startPreparing(order: Order): void {
    this.orderMgmt.updateOrderStatus(order.id, OrderStatus.PREPARING);
  }

  markReady(order: Order): void {
    this.orderMgmt.updateOrderStatus(order.id, OrderStatus.READY);
  }

  getElapsed(order: Order): string {
    const mins = Math.floor((Date.now() - order.orderTime.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  isOverdue(order: Order): boolean {
    return Math.floor((Date.now() - order.orderTime.getTime()) / 60000) > 20;
  }

  isUrgent(order: Order): boolean {
    return Math.floor((Date.now() - order.orderTime.getTime()) / 60000) > 30;
  }

  trackOrder(_: number, o: Order): number { return o.id; }
}
