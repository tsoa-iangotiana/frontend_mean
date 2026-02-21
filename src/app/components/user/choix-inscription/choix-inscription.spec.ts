import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoixInscription } from './choix-inscription';

describe('ChoixInscription', () => {
  let component: ChoixInscription;
  let fixture: ComponentFixture<ChoixInscription>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoixInscription]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChoixInscription);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
