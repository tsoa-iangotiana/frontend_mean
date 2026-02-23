import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayerLoyerComponent } from './payer-loyer.component';

describe('PayerLoyerComponent', () => {
  let component: PayerLoyerComponent;
  let fixture: ComponentFixture<PayerLoyerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayerLoyerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayerLoyerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
