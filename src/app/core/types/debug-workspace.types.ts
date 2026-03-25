import { TDraftOption } from '@/app/shared/services/draft-runtime.service';

export type TBuildDebugWorkspaceDraftPanelParams = {
    readonly panelId: string;
    readonly collapsed: boolean;
    readonly draftOptions: readonly TDraftOption[];
    readonly activeDraftLabel: string;
    readonly draftRegistryLoading: boolean;
    readonly selectedDraftKey: string;
    readonly onSelectDraft: (key: string) => void;
    readonly onRefreshDrafts: () => void;
    readonly onToggleCollapsed: () => void;
};

export type TBuildDebugWorkspaceDiagnosticsPanelParams = {
    readonly panelId: string;
    readonly collapsed: boolean;
    readonly configIssues: readonly string[];
    readonly recentEvents: readonly string[];
    readonly onToggleCollapsed: () => void;
};
