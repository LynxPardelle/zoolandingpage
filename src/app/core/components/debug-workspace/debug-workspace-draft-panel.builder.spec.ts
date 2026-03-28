import { buildDebugWorkspaceDraftPanel } from './debug-workspace-draft-panel.builder';

describe('buildDebugWorkspaceDraftPanel', () => {
    it('builds the draft selection panel with buttons and refresh control', () => {
        const onSelectDraft = jasmine.createSpy('onSelectDraft');
        const onRefreshDrafts = jasmine.createSpy('onRefreshDrafts');
        const onToggleCollapsed = jasmine.createSpy('onToggleCollapsed');

        const panel = buildDebugWorkspaceDraftPanel({
            panelId: 'debugDraftPanelRoot',
            collapsed: false,
            draftOptions: [
                { domain: 'zoolandingpage.com.mx', pageId: 'default', key: 'zoolandingpage.com.mx::default', label: 'zoolandingpage.com.mx / default' },
                { domain: 'music.lynxpardelle.com', pageId: 'default', key: 'music.lynxpardelle.com::default', label: 'music.lynxpardelle.com / default' },
            ],
            activeDraftLabel: 'zoolandingpage.com.mx / default',
            draftRegistryLoading: false,
            selectedDraftKey: 'zoolandingpage.com.mx::default',
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
            'zoolandingpage.com.mx / default',
            'music.lynxpardelle.com / default',
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
                { domain: 'zoolandingpage.com.mx', pageId: 'default', key: 'zoolandingpage.com.mx::default', label: 'zoolandingpage.com.mx / default' },
            ],
            activeDraftLabel: 'zoolandingpage.com.mx / default',
            draftRegistryLoading: false,
            selectedDraftKey: 'zoolandingpage.com.mx::default',
            onSelectDraft: jasmine.createSpy('onSelectDraft'),
            onRefreshDrafts: jasmine.createSpy('onRefreshDrafts'),
            onToggleCollapsed: jasmine.createSpy('onToggleCollapsed'),
        });

        const children = (panel.config as any).components as any[];

        expect(children.some((entry) => entry.id === 'debugDraftPanelCollapsedSummary')).toBeTrue();
        expect(children.some((entry) => entry.id === 'debugDraftPanelDraftButtons')).toBeFalse();
    });
});
