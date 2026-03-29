import { buildDebugWorkspaceDraftPanel } from './debug-workspace-draft-panel.builder';

const PRIMARY_DOMAIN = 'preview.example.test';
const SECONDARY_DOMAIN = 'music.example.test';

describe('buildDebugWorkspaceDraftPanel', () => {
    it('builds the draft selection panel with buttons and refresh control', () => {
        const onSelectDraft = jasmine.createSpy('onSelectDraft');
        const onRefreshDrafts = jasmine.createSpy('onRefreshDrafts');
        const onToggleCollapsed = jasmine.createSpy('onToggleCollapsed');

        const panel = buildDebugWorkspaceDraftPanel({
            panelId: 'debugDraftPanelRoot',
            collapsed: false,
            draftOptions: [
                { domain: PRIMARY_DOMAIN, pageId: 'default', key: `${ PRIMARY_DOMAIN }::default`, label: `${ PRIMARY_DOMAIN } / default` },
                { domain: SECONDARY_DOMAIN, pageId: 'default', key: `${ SECONDARY_DOMAIN }::default`, label: `${ SECONDARY_DOMAIN } / default` },
            ],
            activeDraftLabel: `${ PRIMARY_DOMAIN } / default`,
            draftRegistryLoading: false,
            selectedDraftKey: `${ PRIMARY_DOMAIN }::default`,
            onSelectDraft,
            onRefreshDrafts,
            onToggleCollapsed,
        });

        const children = (panel.config as any).components as any[];
        const buttonsContainer = children.find((entry) => entry.id === 'debugDraftPanelDraftButtons');
        const footerRow = children.find((entry) => entry.id === 'debugDraftPanelFooterRow');
        const headerRow = children.find((entry) => entry.id === 'debugDraftPanelHeaderRow');
        const buttons = buttonsContainer.config.components as any[];
        const refreshButton = (footerRow.config.components as any[]).find((entry) => entry.id === 'debugDraftRefreshButton');
        const toggleButton = (headerRow.config.components as any[]).find((entry) => entry.id === 'debugDraftPanelToggleButton');

        expect(panel.id).toBe('debugDraftPanelRoot');
        expect(buttons.map((entry) => entry.config.label)).toEqual([
            `${ PRIMARY_DOMAIN } / default`,
            `${ SECONDARY_DOMAIN } / default`,
        ]);
        expect(buttons[0].config.classes).toContain('ank-bg-accentColor');
        expect(buttons[1].config.classes).toContain('ank-bg-transparent');
        expect(refreshButton.config.icon).toBe('refresh');
        expect(toggleButton.config.label).toBe('Minimize');

        toggleButton.config.pressed(new MouseEvent('click'));

        expect(onToggleCollapsed).toHaveBeenCalled();
    });

    it('shows a compact summary when the panel is collapsed', () => {
        const panel = buildDebugWorkspaceDraftPanel({
            panelId: 'debugDraftPanelRoot',
            collapsed: true,
            draftOptions: [
                { domain: PRIMARY_DOMAIN, pageId: 'default', key: `${ PRIMARY_DOMAIN }::default`, label: `${ PRIMARY_DOMAIN } / default` },
            ],
            activeDraftLabel: `${ PRIMARY_DOMAIN } / default`,
            draftRegistryLoading: false,
            selectedDraftKey: `${ PRIMARY_DOMAIN }::default`,
            onSelectDraft: jasmine.createSpy('onSelectDraft'),
            onRefreshDrafts: jasmine.createSpy('onRefreshDrafts'),
            onToggleCollapsed: jasmine.createSpy('onToggleCollapsed'),
        });

        const children = (panel.config as any).components as any[];

        expect(children.some((entry) => entry.id === 'debugDraftPanelCollapsedSummary')).toBeTrue();
        expect(children.some((entry) => entry.id === 'debugDraftPanelDraftButtons')).toBeFalse();
    });
});
