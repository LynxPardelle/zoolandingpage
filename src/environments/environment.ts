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
  apiProxyUrl: 'https://yxp97qlog2.execute-api.us-east-1.amazonaws.com/Prod',
  apiProxyTestUrl: 'https://11zpm6wug2.execute-api.us-east-1.amazonaws.com/Test',
  configApiUrl: 'https://api.zoolandingpage.com.mx',
  drafts: {
    enabled: true,
    basePath: 'drafts',
  }
} as const;
