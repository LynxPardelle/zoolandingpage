import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { draftConfigInterceptor } from './shared/interceptors/draft-config.interceptor';
import { provideConditionHandlers } from './shared/utility/condition-handler/provide-condition-handlers';
import { provideEventHandlers } from './shared/utility/event-handler/provide-event-handlers';
import { provideValueHandlers } from './shared/utility/value-handler/provide-value-handlers';


export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    ...(environment.production ? [provideClientHydration(withEventReplay())] : []),
    provideHttpClient(withInterceptors([draftConfigInterceptor])),

    ...provideConditionHandlers(),
    ...provideEventHandlers(),
    ...provideValueHandlers(),

  ],
};
