export type TIntegrationPlatformRuntimeReadKind = 'connectionList';

export type TIntegrationPlatformRuntimeActionKind =
    | 'disable'
    | 'requestReconnect'
    | 'stripeOnboardingStart'
    | 'stripeOnboardingReturn'
    | 'stripeOnboardingDeauthorize';

export type TIntegrationPlatformRuntimeReadBinding = {
    readonly read: TIntegrationPlatformRuntimeReadKind;
};

export type TIntegrationPlatformRuntimeActionBinding = {
    readonly action: TIntegrationPlatformRuntimeActionKind;
    readonly bindingId?: string;
};

export type TIntegrationConnectionSummary = {
    readonly connectionId: string;
    readonly provider: string;
    readonly status: string;
    readonly mode: 'test' | 'live';
    readonly capabilities: readonly string[];
    readonly revision: number;
};

export type TIntegrationPlatformBrowserResponse<T = unknown> = {
    readonly ok?: boolean;
    readonly data: T;
    readonly requestId?: string;
};
