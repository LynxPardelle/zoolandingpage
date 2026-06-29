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
  apiProxyUrl: 'https://yxp97qlog2.execute-api.us-east-1.amazonaws.com/Prod',
  apiProxyTestUrl: 'https://11zpm6wug2.execute-api.us-east-1.amazonaws.com/Prod',
  configApiUrl: 'https://api.zoolandingpage.com.mx',
  configApiRuntimeFallbackUrl: 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod',
  configApiServerFallbackUrl: 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod',
  configApiRuntimeFallbackUrls: {
    dev: 'https://p5sbs2w8zb.execute-api.us-east-1.amazonaws.com/Prod',
    test: 'https://jaay9p8gv5.execute-api.us-east-1.amazonaws.com/Prod',
    production: 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod',
  },
  configApiServerFallbackUrls: {
    dev: 'https://p5sbs2w8zb.execute-api.us-east-1.amazonaws.com/Prod',
    test: 'https://jaay9p8gv5.execute-api.us-east-1.amazonaws.com/Prod',
    production: 'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod',
  },
  drafts: {
    enabled: false,
    basePath: 'drafts'
  }
} as const;
