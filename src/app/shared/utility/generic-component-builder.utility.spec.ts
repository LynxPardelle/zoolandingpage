import { GenericComponentBuilder } from './generic-component-builder.utility';

describe('GenericComponentBuilder', () => {
    it('builds a text component', () => {
        const component = GenericComponentBuilder.text('title', 'h3', 'Draft Workspace', 'title-classes');

        expect(component).toEqual({
            id: 'title',
            type: 'text',
            config: {
                tag: 'h3',
                text: 'Draft Workspace',
                classes: 'title-classes',
            },
        });
    });

    it('builds a translated text component', () => {
        const component = GenericComponentBuilder.translatedText('issuesTitle', 'p', 'ui.debugPanel.configIssues', 'issue-classes');

        expect(component.valueInstructions).toBe('set:config.text,i18n,ui.debugPanel.configIssues');
        expect(component.config).toEqual({
            tag: 'p',
            text: '',
            classes: 'issue-classes',
        });
    });

    it('builds a container component', () => {
        const child = GenericComponentBuilder.text('child', 'span', 'Label', '');
        const component = GenericComponentBuilder.container('wrapper', 'div', 'wrapper-classes', [child]);

        expect(component.config).toEqual({
            tag: 'div',
            classes: 'wrapper-classes',
            components: [child],
        });
    });

    it('builds a button component with button options', () => {
        const pressed = jasmine.createSpy('pressed');
        const component = GenericComponentBuilder.button('refresh', 'Refresh', 'refresh-classes', pressed, {
            icon: 'refresh',
            ariaLabel: 'Refresh drafts',
            loading: true,
        });

        expect(component.config).toEqual({
            type: 'button',
            label: 'Refresh',
            classes: 'refresh-classes',
            pressed,
            icon: 'refresh',
            ariaLabel: 'Refresh drafts',
            loading: true,
        });
    });

    it('builds a translated event button component', () => {
        const component = GenericComponentBuilder.translatedEventButton(
            'download',
            'ui.debugPanel.downloadDraftPayloads',
            'downloadDraftPayloads',
            'button-classes',
        );

        expect(component.eventInstructions).toBe('downloadDraftPayloads');
        expect(component.valueInstructions).toBe('set:config.label,i18n,ui.debugPanel.downloadDraftPayloads');
        expect(component.config).toEqual({
            type: 'button',
            label: '',
            classes: 'button-classes',
        });
    });
});
