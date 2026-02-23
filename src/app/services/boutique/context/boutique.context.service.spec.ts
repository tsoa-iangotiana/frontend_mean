import { TestBed } from '@angular/core/testing';

import { BoutiqueContextService } from './boutique.context.service';

describe('BoutiqueContextService', () => {
  let service: BoutiqueContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BoutiqueContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
