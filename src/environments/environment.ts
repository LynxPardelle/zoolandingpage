/**
 * Development Environment Configuration
 *
 * Transport and bootstrap settings for development mode.
 */

import { TEnvironment } from "@/app/shared/types/environment.type";

export const environment: TEnvironment = {
  production: false,
  development: true,
  apiUrl: 'https://api.zoolandingpage.com.mx',
  configApiUrl: 'https://api.zoolandingpage.com.mx',
  drafts: {
    enabled: true,
    basePath: 'drafts',
  }
} as const;
