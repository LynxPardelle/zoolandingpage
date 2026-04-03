import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { TestBed } from '@angular/core/testing';
import { resolveDynamicValue } from '../utility/component-orchestrator.utility';
import { provideConditionHandlers } from '../utility/condition-handler/provide-condition-handlers';
import { provideValueHandlers } from '../utility/value-handler/provide-value-handlers';
import { ValueOrchestrator } from './value-orchestrator';

describe('ValueOrchestrator', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ValueOrchestrator, ...provideConditionHandlers(), ...provideValueHandlers()],
        });
    });

    it('supports quoted arguments for conditional value instructions', () => {
        const orchestrator = TestBed.inject(ValueOrchestrator);
        const valueInstructions = `set:config.classes,when,"all:hostGt,runtimeState.viewport.scrollY,16","header-dark ank-color-white","header-light ank-color-textColor"`.replaceAll('\\"', '"');
        const component = {
            id: 'siteHeader',
            type: 'container',
            config: {
                classes: 'header-light',
                components: [],
            },
            valueInstructions,
        } as TGenericComponent;

        expect((orchestrator as any).parseCommand(valueInstructions).rawArgs).toEqual([
            'config.classes',
            'when',
            'all:hostGt,runtimeState.viewport.scrollY,16',
            'header-dark ank-color-white',
            'header-light ank-color-textColor',
        ]);

        const resolved = orchestrator.apply(component, {
            host: {
                runtimeState: {
                    viewport: {
                        scrollY: 32,
                    },
                },
            },
        });

        const resolvedClassesThunk = (resolved as any).config?.classes;
        const resolvedClasses = resolveDynamicValue(resolvedClassesThunk);

        expect(typeof resolvedClassesThunk).toBe('function');
        expect(resolvedClasses as string | null).toBe('header-dark ank-color-white');
    });
});
