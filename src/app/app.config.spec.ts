import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { ConditionOrchestrator } from './shared/services/condition-orchestrator';

describe('appConfig condition handlers', () => {
    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [...(appConfig.providers ?? [])],
        });
    });

    it('registers condition handlers used by draft payloads', () => {
        const orchestrator = TestBed.inject(ConditionOrchestrator);
        const component = {
            id: 'test',
            type: 'container',
            config: {},
            condition: 'all:hostEq,expected.example;all:modalRefId,terms-of-service;all:env,production',
        } as unknown as TGenericComponent;

        const result = orchestrator.evaluate(component, {
            host: {
                host: 'other.example',
                modalRefId: 'privacy-policy',
            },
        });

        expect(result).toBeFalse();
    });
});
