import { TestBed } from '@angular/core/testing';

import { ConfigurationsOrchestrator } from './configurations-orchestrator';

describe('ConfigurationsOrchestrator', () => {
  let service: ConfigurationsOrchestrator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigurationsOrchestrator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
