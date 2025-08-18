import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Disable animations during server-side rendering for performance / determinism
    provideNoopAnimations(),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
