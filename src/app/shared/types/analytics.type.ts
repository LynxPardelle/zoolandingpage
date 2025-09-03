export type TExpandedAnalytics = {
    ip?: string;
    userAgent?: string;
    language?: string;
    platform?: string;
    vendor?: string;
    cookiesEnabled?: boolean;
    doNotTrack?: string | null;
    screenWidth?: number;
    screenHeight?: number;
    colorDepth?: number;
    timezone?: string;
    geolocationLatitude?: number;
    geolocationLongitude?: number;
    geolocationAccuracy?: number;
    cookies?: string;
    battery?: string;
    connection?: string;
    localId?: string;
    sessionId?: string;
}

export type TTrackOptions =
    | 'ip'
    | 'userAgent'
    | 'language'
    | 'platform'
    | 'vendor'
    | 'cookiesEnabled'
    | 'doNotTrack'
    | 'screenWidth'
    | 'screenHeight'
    | 'colorDepth'
    | 'timezone'
    | 'geolocationLatitude'
    | 'geolocationLongitude'
    | 'geolocationAccuracy'
    | 'cookies'
    | 'battery'
    | 'connection';

export type TAnalyticsEvent = {
    readonly name: string;
    readonly category?: string;
    readonly label?: string;
    readonly value?: number;
    readonly meta?: Record<string, unknown>;
    readonly timestamp: number;
};

export type TDataDropResponse = {
    ok: boolean;
    error?: string;
    bucket?: string;
    key?: string;
    size?: number;
    dryRun?: boolean;
}
