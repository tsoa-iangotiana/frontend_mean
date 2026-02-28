import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarPanier } from './sidebarPanier';

describe('sidebarPanier', () => {
  let component: SidebarPanier;
  let fixture: ComponentFixture<SidebarPanier>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarPanier]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarPanier);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
