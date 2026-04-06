import { TestBed } from '@angular/core/testing';

import { EVENT_HANDLERS } from '../utility/event-handler/event-handlers.token';
import { EventOrchestrator } from './event-orchestrator';

describe('EventOrchestrator', () => {
  let service: EventOrchestrator;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: {
            id: 'a',
            handle: (_ctx: any, _args: unknown[]) => {
              // replaced per-test when needed
            },
          },
        },
      ],
    });
    service = TestBed.inject(EventOrchestrator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('dispatches commands in order and resolves event.* args', () => {
    const calls: Array<{ id: string; args: unknown[] }> = [];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: {
            id: 'first',
            handle: (_ctx: any, args: unknown[]) => calls.push({ id: 'first', args }),
          },
        },
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: {
            id: 'second',
            handle: (_ctx: any, args: unknown[]) => calls.push({ id: 'second', args }),
          },
        },
      ],
    });
    const sut = TestBed.inject(EventOrchestrator);

    const event = {
      componentId: 'cmp-1',
      eventName: 'click',
      meta_title: 'hero_primary',
      eventData: { id: 7 },
      eventInstructions:
        'first:1,event.meta_title; second:event.eventData.id,null,undefined,hello',
    };

    sut.execute({ event, host: {} });

    expect(calls.length).toBe(2);
    expect(calls[0]).toEqual({ id: 'first', args: [1, 'hero_primary'] });
    expect(calls[1]).toEqual({ id: 'second', args: [7, null, undefined, 'hello'] });
  });

  it('filters by allowedActions when provided', () => {
    const calls: string[] = [];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: {
            id: 'a',
            handle: () => calls.push('a'),
          },
        },
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: {
            id: 'b',
            handle: () => calls.push('b'),
          },
        },
      ],
    });
    const sut = TestBed.inject(EventOrchestrator);

    const event = {
      componentId: 'cmp',
      eventName: 'click',
      eventInstructions: 'a:1; b:2',
    };

    sut.execute({ event, host: {} }, { allowedActions: ['a'] });
    expect(calls).toEqual(['a']);
  });

  it('calls fallback when no handler exists', () => {
    const fallbackCalls: Array<{ id: string; args: unknown[] }> = [];

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [] });
    const sut = TestBed.inject(EventOrchestrator);

    const event = {
      componentId: 'cmp',
      eventName: 'click',
      meta_title: 'x',
      eventInstructions: 'unknown:event.meta_title,2',
    };

    sut.execute(
      { event, host: {} },
      {
        fallback: (id, args) => fallbackCalls.push({ id, args }),
      },
    );

    expect(fallbackCalls).toEqual([{ id: 'unknown', args: ['x', 2] }]);
  });

  it('throws on duplicate handlers for the same action', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: { id: 'dup', handle: () => { } },
        },
        {
          provide: EVENT_HANDLERS,
          multi: true,
          useValue: { id: 'dup', handle: () => { } },
        },
      ],
    });
    const sut = TestBed.inject(EventOrchestrator);

    const event = {
      componentId: 'cmp',
      eventName: 'click',
      eventInstructions: 'dup:1',
    };

    expect(() => sut.execute({ event, host: {} })).toThrow();
  });
});
