/**
 * Development Environment Configuration
 *
 * Transport and bootstrap settings for development mode.
 */

import { TEnvironment } from "@/app/shared/types/environment.type";

export const environment: TEnvironment = {
  production: false,
  development: true,
  apiUrl: 'https://nxk92p5uzc.execute-api.us-east-1.amazonaws.com',
  configApiUrl: 'https://nxk92p5uzc.execute-api.us-east-1.amazonaws.com',
  drafts: {
    enabled: true,
    basePath: 'assets/drafts',
  }
} as const;
