/**
 * Development Environment Configuration
 *
 * Transport and bootstrap settings for development mode.
 */

import { TEnvironment } from "@/app/shared/types/environment.type";

export const environment: TEnvironment = {
  production: false,
  development: true,
  apiUrl: 'https://test.zoolandingpage.com.mx',
  apiProxyUrl: 'https://11zpm6wug2.execute-api.us-east-1.amazonaws.com/Prod',
  apiProxyTestUrl: 'https://11zpm6wug2.execute-api.us-east-1.amazonaws.com/Prod',
  configApiUrl: 'https://api.zoolandingpage.com.mx',
  configApiRuntimeFallbackUrl: 'https://jaay9p8gv5.execute-api.us-east-1.amazonaws.com/Prod',
  configApiServerFallbackUrl: 'https://jaay9p8gv5.execute-api.us-east-1.amazonaws.com/Prod',
  drafts: {
    enabled: true,
    basePath: 'drafts',
  }
} as const;
