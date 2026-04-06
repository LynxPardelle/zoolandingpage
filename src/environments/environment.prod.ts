/**
 * Production Environment Configuration
 *
 * Transport and bootstrap settings for production mode.
 */
import { TEnvironment } from "@/app/shared/types/environment.type";

export const environment: TEnvironment = {
  production: true,
  development: false,
  apiUrl: 'https://api.zoolandingpage.com.mx',
  configApiUrl: 'https://api.zoolandingpage.com.mx',
  drafts: {
    enabled: false,
    basePath: 'assets/drafts'
  }
} as const;
