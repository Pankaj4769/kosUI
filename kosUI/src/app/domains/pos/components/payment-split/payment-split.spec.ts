import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentSplit } from './payment-split.component';

describe('PaymentSplit', () => {
  let component: PaymentSplit;
  let fixture: ComponentFixture<PaymentSplit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentSplit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentSplit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
