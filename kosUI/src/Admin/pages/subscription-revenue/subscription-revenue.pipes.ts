import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'paymentFilter', standalone: true, pure: false })
export class PaymentFilterPipe implements PipeTransform {
  transform(logs: any[], status: string): number {
    return (logs || []).filter(l => l.status === status).length;
  }
}

@Pipe({ name: 'refundFilter', standalone: true, pure: false })
export class RefundFilterPipe implements PipeTransform {
  transform(refunds: any[], status: string): number {
    return (refunds || []).filter(r => r.status === status).length;
  }
}

@Pipe({ name: 'regionFilter', standalone: true, pure: true })
export class RegionFilterPipe implements PipeTransform {
  transform(prices: any[], region: string): boolean {
    return (prices || []).some(p => p.region === region);
  }
}
