import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { draftConfigInterceptor } from './shared/interceptors/draft-config.interceptor';
import { provideEventHandlers } from './shared/utility/event-handler/provide-event-handlers';
import { provideValueHandlers } from './shared/utility/value-handler/provide-value-handlers';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideClientHydration(withEventReplay()),
    // Enable browser animations (component triggers rely on this)
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([draftConfigInterceptor])),

    ...provideEventHandlers(),
    ...provideValueHandlers(),

  ],
};
