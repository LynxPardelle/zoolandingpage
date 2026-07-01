import type { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { TestBed } from '@angular/core/testing';
import { resolveDynamicValue } from '../utility/component-orchestrator.utility';
import { provideConditionHandlers } from '../utility/condition-handler/provide-condition-handlers';
import { provideValueHandlers } from '../utility/value-handler/provide-value-handlers';
import { ValueOrchestrator } from './value-orchestrator';
import { VariableStoreService } from './variable-store.service';

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

    it('joins dynamic text segments without relying on trimmed literal spaces', () => {
        const orchestrator = TestBed.inject(ValueOrchestrator);
        const component = {
            id: 'categoryLink',
            type: 'link',
            config: {
                categorySlug: 'web',
                text: 'Categoría: Web',
            },
            valueInstructions: 'set:config.text,joinText,Categoría:,eval:config.categorySlug',
        } as unknown as TGenericComponent;

        const resolved = orchestrator.apply(component, { host: {} });
        const resolvedTextThunk = (resolved as any).config?.text;
        const resolvedText = resolveDynamicValue(resolvedTextThunk);

        expect(typeof resolvedTextThunk).toBe('function');
        expect(resolvedText).toBe('Categoría: web');
    });

    it('resolves Quill delta rich text variables as safe HTML for generic text', () => {
        const orchestrator = TestBed.inject(ValueOrchestrator);
        const variables = TestBed.inject(VariableStoreService);
        variables.setPayload({
            variables: {
                articleContent: {
                    ops: [
                        { insert: 'Texto ' },
                        { insert: 'importante', attributes: { bold: true } },
                        { insert: ' con enlace', attributes: { link: 'https://zoositioweb.com.mx/blog' } },
                        { insert: '.\n' },
                    ],
                },
            },
        } as any);
        const component = {
            id: 'articleBody',
            type: 'text',
            config: {
                tag: 'p',
                text: 'Fallback',
                html: '',
            },
            valueInstructions: 'set:config.html,richTextHtmlOr,articleContent,Fallback',
        } as unknown as TGenericComponent;

        const resolved = orchestrator.apply(component, { host: {} });
        const resolvedHtmlThunk = (resolved as any).config?.html;
        const resolvedHtml = resolveDynamicValue(resolvedHtmlThunk);

        expect(typeof resolvedHtmlThunk).toBe('function');
        expect(resolvedHtml).toContain('<p>Texto <strong>importante</strong>');
        expect(resolvedHtml).toContain('<a href="https://zoositioweb.com.mx/blog"> con enlace</a>');
        expect(resolvedHtml).not.toContain('[object Object]');
    });

    it('formats safe support request ids for draft-visible error states', () => {
        const orchestrator = TestBed.inject(ValueOrchestrator);
        const variables = TestBed.inject(VariableStoreService);
        variables.setRuntimeValue('remoteStatus.contentHub.publish.requestId', 'req-safe-123');
        const component = {
            id: 'publishSupportId',
            type: 'text',
            config: {
                text: '',
            },
            valueInstructions: 'set:config.text,supportIdOr,remoteStatus.contentHub.publish.requestId,blog.supportId,ID de soporte: {{ id }}',
        } as unknown as TGenericComponent;

        const resolved = orchestrator.apply(component, { host: {} });
        const resolvedText = resolveDynamicValue((resolved as any).config?.text);

        expect(resolvedText).toBe('ID de soporte: req-safe-123');
    });

    it('does not format malformed support request ids', () => {
        const orchestrator = TestBed.inject(ValueOrchestrator);
        const variables = TestBed.inject(VariableStoreService);
        variables.setRuntimeValue('remoteStatus.contentHub.publish.requestId', 'req-unsafe/<script>');
        const component = {
            id: 'publishSupportId',
            type: 'text',
            config: {
                text: '',
            },
            valueInstructions: 'set:config.text,supportIdOr,remoteStatus.contentHub.publish.requestId,blog.supportId,ID de soporte: {{ id }}',
        } as unknown as TGenericComponent;

        const resolved = orchestrator.apply(component, { host: {} });
        const resolvedText = resolveDynamicValue((resolved as any).config?.text);

        expect(resolvedText).toBe('');
    });
});
