import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriqueLoyerComponent } from './historique-loyer.component';

describe('HistoriqueLoyerComponent', () => {
  let component: HistoriqueLoyerComponent;
  let fixture: ComponentFixture<HistoriqueLoyerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriqueLoyerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoriqueLoyerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
