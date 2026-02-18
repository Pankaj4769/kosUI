import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffDirectoryComponent } from '../staff-directory/staff-directory.component';

describe('StaffDirectoryComponent', () => {
  let component: StaffDirectoryComponent;
  let fixture: ComponentFixture<StaffDirectoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffDirectoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffDirectoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
