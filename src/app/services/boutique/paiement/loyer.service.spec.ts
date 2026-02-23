import { TestBed } from '@angular/core/testing';

import { LoyerService } from './loyer.service';

describe('LoyerService', () => {
  let service: LoyerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoyerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
