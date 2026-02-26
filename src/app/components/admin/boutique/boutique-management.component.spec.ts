import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BoutiqueManagementComponent } from './boutique-management.component';

describe('BoutiqueManagementComponent', () => {
  let component: BoutiqueManagementComponent;
  let fixture: ComponentFixture<BoutiqueManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoutiqueManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BoutiqueManagementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
