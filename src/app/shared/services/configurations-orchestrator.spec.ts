import { TestBed } from '@angular/core/testing';

import { ConfigurationsOrchestratorService } from './configurations-orchestrator';

describe('ConfigurationsOrchestratorService', () => {
  let service: ConfigurationsOrchestratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigurationsOrchestratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
