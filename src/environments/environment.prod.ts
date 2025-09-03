/**
 * Production Environment Configuration
 *
 * Environment settings for production mode.
 * Includes API URLs, localStorage keys, and feature flags.
 */
import { TEnvironment } from "@/app/shared/types/environment.type";

export const environment: TEnvironment = {
  production: true,
  development: false,
  apiUrl: 'https://api.zoolanding.com',
  apiVersion: 'v1',
  localStorage: {
    themeKey: 'zoo-landing-theme',
    languageKey: 'zoo-landing-language',
    userPreferencesKey: 'zoo-landing-preferences',
    id: 'zoo-landing-id',
    sessionId: 'zoo-landing-session-id',
    allowAnalyticsKey: 'zoo-landing-allow-analytics',
    analyticsConsentSnoozeKey: 'zoo-landing-allow-analytics-snooze',
    pageViewCountKey: 'zoo-landing-page-view-count'
  },
  features: {
    analytics: true,
    debugMode: false,
    mockData: false,
    analyticsConsentUI: 'none',
    analyticsConsentSnoozeSeconds: 86400
  },
  app: {
    name: 'Zoo Landing Page',
    version: '1.0.0',
    description: 'A modern zoo landing page built with Angular and ngx-angora-css'
  },
  track: [
    'ip',
    'userAgent',
    'language',
    'platform',
    'vendor',
    'cookiesEnabled',
    'doNotTrack',
    'screenWidth',
    'screenHeight',
    'colorDepth',
    'timezone',
    'geolocationLatitude',
    'geolocationLongitude',
    'geolocationAccuracy',
    'cookies',
    'battery',
    'connection'
  ]
} as const;
