/**
 * Production Environment Configuration
 * 
 * Environment settings for production mode.
 * Includes API URLs, localStorage keys, and feature flags.
 */

export const environment = {
  production: true,
  development: false,
  apiUrl: 'https://api.zoolanding.com/api',
  apiVersion: 'v1',
  localStorage: {
    themeKey: 'zoo-landing-theme',
    languageKey: 'zoo-landing-language',
    userPreferencesKey: 'zoo-landing-preferences'
  },
  features: {
    analytics: true,
    debugMode: false,
    mockData: false
  },
  app: {
    name: 'Zoo Landing Page',
    version: '1.0.0',
    description: 'A modern zoo landing page built with Angular and ngx-angora-css'
  }
} as const;
