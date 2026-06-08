export type TDraftTenantEnvironment = 'local' | 'test' | 'production' | 'unknown';

export type TDraftTenantProfile = {
    readonly draftDomain: string;
    readonly pageId: string;
    readonly routePath: string;
    readonly environment: TDraftTenantEnvironment;
    readonly publicConfigRef?: string;
};

export type TDraftTenantState = {
    readonly active: TDraftTenantProfile | null;
    readonly authProfileId: string | null;
};
