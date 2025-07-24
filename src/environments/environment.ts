/**
 * Development Environment Configuration
 * 
 * Environment settings for development mode.
 * Includes API URLs, localStorage keys, and feature flags.
 */

export const environment = {
  production: false,
  development: true,
  apiUrl: 'http://localhost:3000/api',
  apiVersion: 'v1',
  localStorage: {
    themeKey: 'zoo-landing-theme',
    languageKey: 'zoo-landing-language',
    userPreferencesKey: 'zoo-landing-preferences'
  },
  features: {
    analytics: false,
    debugMode: true,
    mockData: true
  },
  app: {
    name: 'Zoo Landing Page',
    version: '1.0.0',
    description: 'A modern zoo landing page built with Angular and ngx-angora-css'
  }
} as const;
