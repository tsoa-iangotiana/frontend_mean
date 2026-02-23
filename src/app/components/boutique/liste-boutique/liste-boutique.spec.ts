import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeBoutique } from './ListeBoutique';

describe('ListeBoutique', () => {
  let component: ListeBoutique;
  let fixture: ComponentFixture<ListeBoutique>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeBoutique]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListeBoutique);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
