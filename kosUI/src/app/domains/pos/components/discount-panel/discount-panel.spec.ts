import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscountPanel } from './discount-panel.component';

describe('DiscountPanel', () => {
  let component: DiscountPanel;
  let fixture: ComponentFixture<DiscountPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscountPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscountPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
