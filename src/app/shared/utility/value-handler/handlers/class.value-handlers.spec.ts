import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { TestBed } from '@angular/core/testing';
import { provideConditionHandlers } from '../../condition-handler/provide-condition-handlers';
import { classJoinValueHandler, whenValueHandler } from './class.value-handlers';

describe('class.value-handlers', () => {
    it('joins classes removing duplicates and empty values', () => {
        const handler = classJoinValueHandler();

        const value = handler.resolve({} as never, [
            'btn btn-primary',
            '',
            ['btn', 'rounded', null, undefined],
            'rounded px-2',
        ]);

        expect(value).toBe('btn btn-primary rounded px-2');
    });

    it('returns the matching branch when a condition DSL resolves true', () => {
        TestBed.configureTestingModule({
            providers: [...provideConditionHandlers()],
        });

        const handler = TestBed.runInInjectionContext(() => whenValueHandler());
        const component = {
            id: 'header',
            type: 'container',
            config: { classes: 'base' },
        } as TGenericComponent;

        const value = handler.resolve({
            component,
            host: {
                runtimeState: {
                    viewport: {
                        scrollY: 24,
                    },
                },
            },
        }, [
            'all:hostGt,runtimeState.viewport.scrollY,16',
            'header-dark',
            'header-light',
        ]);

        expect(value).toBe('header-dark');
    });
});
