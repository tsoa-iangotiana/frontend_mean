import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketManagementComponent } from './ticket-management.component';

describe('TicketManagementComponent', () => {
  let component: TicketManagementComponent;
  let fixture: ComponentFixture<TicketManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketManagementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
