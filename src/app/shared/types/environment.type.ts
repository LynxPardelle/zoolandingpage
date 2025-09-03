import { TTrackOptions } from "./analytics.type";

export type TEnvironment = {
    readonly production: boolean;
    readonly development: boolean;
    readonly apiUrl: string;
    readonly apiVersion: string;
    readonly localStorage: {
        readonly themeKey: string;
        readonly languageKey: string;
        readonly userPreferencesKey: string;
        readonly id: string;
        readonly sessionId: string;
        readonly allowAnalyticsKey: string;
        /**
         * Key used to store a snooze timestamp (epoch ms) to postpone asking for analytics consent again.
         */
        readonly analyticsConsentSnoozeKey: string;
        readonly pageViewCountKey: string;
    };
    readonly features: {
        readonly analytics: boolean;
        readonly debugMode: boolean;
        readonly mockData: boolean;
        /**
         * Controls how the analytics consent prompt is displayed in the UI.
         * - 'modal': show a blocking modal dialog
         * - 'toast': show an actionable toast notification
         * - 'sheet': show a bottom-sheet-like non-blocking prompt using the toast host (actions: Allow/Decline/Later)
         * - 'none': disable consent UI entirely; analytics are treated as allowed by default
         */
        readonly analyticsConsentUI: 'modal' | 'toast' | 'sheet' | 'none';
        /**
         * Default snooze duration in seconds for the "Later" action on the analytics consent UI.
         * Example: 30 (dev) or 86400 (24h, production)
         */
        readonly analyticsConsentSnoozeSeconds: number;
    };
    readonly app: {
        readonly name: string;
        readonly version: string;
        readonly description: string;
    };
    readonly track: readonly TTrackOptions[];
};
