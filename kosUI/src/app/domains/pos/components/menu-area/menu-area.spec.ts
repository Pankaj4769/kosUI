import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuArea } from './menu-area.component';

describe('MenuArea', () => {
  let component: MenuArea;
  let fixture: ComponentFixture<MenuArea>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuArea]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuArea);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
