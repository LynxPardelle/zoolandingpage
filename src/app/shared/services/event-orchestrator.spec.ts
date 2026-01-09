import { TestBed } from '@angular/core/testing';

import { EventOrchestrator } from './event-orchestrator';

describe('EventOrchestrator', () => {
  let service: EventOrchestrator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EventOrchestrator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
