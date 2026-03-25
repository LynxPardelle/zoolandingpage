import { buildDebugWorkspaceDiagnosticsPanel } from './debug-workspace-diagnostics-panel.builder';

describe('buildDebugWorkspaceDiagnosticsPanel', () => {
    it('builds diagnostics actions, issues, and recent events', () => {
        const panel = buildDebugWorkspaceDiagnosticsPanel({
            panelId: 'debugDiagnosticsPanelRoot',
            collapsed: false,
            configIssues: ['Missing seo payload.'],
            recentEvents: ['page_view | navigation | /home'],
            onToggleCollapsed: jasmine.createSpy('onToggleCollapsed'),
        });

        const children = (panel.config as any).components as any[];
        const actionRow = children.find((entry) => entry.id === 'debugDiagnosticsActionRow');
        const issuesSection = children.find((entry) => entry.id === 'debugConfigIssuesSection');
        const eventsSection = children.find((entry) => entry.id === 'debugAnalyticsEventsSection');
        const headerRow = children.find((entry) => entry.id === 'debugDiagnosticsPanelHeaderRow');
        const toggleButton = (headerRow.config.components as any[]).find((entry) => entry.id === 'debugDiagnosticsPanelToggleButton');
        const issuesList = (issuesSection.config.components as any[]).find((entry) => entry.id === 'debugConfigIssuesList');
        const eventsList = (eventsSection.config.components as any[]).find((entry) => entry.id === 'debugAnalyticsEventsList');

        expect(panel.id).toBe('debugDiagnosticsPanelRoot');
        expect((actionRow.config.components as any[]).some((entry) => entry.id === 'debugDownloadDraftPayloadsButton')).toBeTrue();
        expect((actionRow.config.components as any[]).some((entry) => entry.id === 'debugWriteDraftsToDiskButton')).toBeTrue();
        expect((issuesList.config.components as any[]).length).toBe(1);
        expect((eventsList.config.components as any[]).length).toBe(1);
        expect(toggleButton.config.label).toBe('Minimize');
    });

    it('skips the issues block when there are no validation issues', () => {
        const panel = buildDebugWorkspaceDiagnosticsPanel({
            panelId: 'debugDiagnosticsPanelRoot',
            collapsed: false,
            configIssues: [],
            recentEvents: [],
            onToggleCollapsed: jasmine.createSpy('onToggleCollapsed'),
        });

        const children = (panel.config as any).components as any[];
        const eventsSection = children.find((entry) => entry.id === 'debugAnalyticsEventsSection');
        const eventsList = (eventsSection.config.components as any[]).find((entry) => entry.id === 'debugAnalyticsEventsList');

        expect(children.some((entry) => entry.id === 'debugConfigIssuesList')).toBeFalse();
        expect((eventsList.config.components as any[]).some((entry) => entry.id === 'debugAnalyticsEventEmpty')).toBeTrue();
    });

    it('renders a compact summary when collapsed', () => {
        const panel = buildDebugWorkspaceDiagnosticsPanel({
            panelId: 'debugDiagnosticsPanelRoot',
            collapsed: true,
            configIssues: ['Missing seo payload.'],
            recentEvents: ['page_view | navigation | /home'],
            onToggleCollapsed: jasmine.createSpy('onToggleCollapsed'),
        });

        const children = (panel.config as any).components as any[];

        expect(children.some((entry) => entry.id === 'debugDiagnosticsPanelCollapsedSummary')).toBeTrue();
        expect(children.some((entry) => entry.id === 'debugAnalyticsEventsList')).toBeFalse();
    });
});
