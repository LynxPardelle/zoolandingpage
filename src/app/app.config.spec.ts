import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { InteractionScopeService } from './shared/components/interaction-scope/interaction-scope.service';
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
            condition: 'all:hostEq,expected.example;all:modalRefId,terms-of-service',
        } as unknown as TGenericComponent;

        const result = orchestrator.evaluate(component, {
            host: {
                host: 'other.example',
                modalRefId: 'privacy-policy',
            },
        });

        expect(result).toBeFalse();
    });

    it('registers scope condition handlers used by upload-aware drafts', () => {
        const orchestrator = TestBed.inject(ConditionOrchestrator);
        const scope = new InteractionScopeService();
        scope.configure({ scopeId: 'uploadForm' });
        scope.setFieldValue('heroImageUpload', {
            status: 'success',
            publicUrl: 'https://assets.example/hero.png',
        });

        const component = {
            id: 'test-upload-preview',
            type: 'container',
            config: {},
            condition: 'all:scopeEq,values.heroImageUpload.status,success;all:scope,values.heroImageUpload.publicUrl',
        } as unknown as TGenericComponent;

        const result = orchestrator.evaluate(component, {
            host: { interactionScope: scope },
        });

        expect(result).toBeTrue();
    });
});
