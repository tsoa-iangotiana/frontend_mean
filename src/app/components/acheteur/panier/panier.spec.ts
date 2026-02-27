import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanierComponent } from './panier';

describe('PanierComponent', () => {
  let component: PanierComponent;
  let fixture: ComponentFixture<PanierComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanierComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PanierComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
