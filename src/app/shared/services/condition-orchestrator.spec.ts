import { TestBed } from '@angular/core/testing';
import { CONDITION_HANDLERS } from '../utility/condition-handler/condition-handlers.token';
import { ConditionOrchestrator } from './condition-orchestrator';

describe('ConditionOrchestrator', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ConditionOrchestrator,
                { provide: CONDITION_HANDLERS, multi: true, useValue: { id: 'truthy', resolve: () => true } },
                { provide: CONDITION_HANDLERS, multi: true, useValue: { id: 'falsy', resolve: () => false } },
            ],
        });
    });

    it('treats all-only instructions as an AND group', () => {
        const service = TestBed.inject(ConditionOrchestrator);

        expect(service.evaluate({ condition: 'all:truthy; all:falsy' } as any, { host: null })).toBeFalse();
        expect(service.evaluate({ condition: 'all:truthy; all:truthy' } as any, { host: null })).toBeTrue();
    });

    it('treats any-only instructions as an OR group', () => {
        const service = TestBed.inject(ConditionOrchestrator);

        expect(service.evaluate({ condition: 'any:falsy; any:falsy' } as any, { host: null })).toBeFalse();
        expect(service.evaluate({ condition: 'any:falsy; any:truthy' } as any, { host: null })).toBeTrue();
    });
});
