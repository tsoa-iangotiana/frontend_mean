import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxManagementComponent } from './box-management.component';

describe('BoxManagementComponent', () => {
  let component: BoxManagementComponent;
  let fixture: ComponentFixture<BoxManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoxManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoxManagementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
