import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilManagemntComponent } from './profil-managemnt.component';

describe('ProfilManagemntComponent', () => {
  let component: ProfilManagemntComponent;
  let fixture: ComponentFixture<ProfilManagemntComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilManagemntComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilManagemntComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
