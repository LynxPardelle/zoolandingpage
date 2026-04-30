import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { RuntimeService } from '@/app/core/services/runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { draftConfigInterceptor } from './shared/interceptors/draft-config.interceptor';
import { provideConditionHandlers } from './shared/utility/condition-handler/provide-condition-handlers';
import { provideEventHandlers } from './shared/utility/event-handler/provide-event-handlers';
import { provideValueHandlers } from './shared/utility/value-handler/provide-value-handlers';


export function initializeRuntimeConfig(): Promise<void> {
  const runtime = inject(RuntimeService);
  const language = inject(LanguageService);
  return runtime.initialize(language.currentLanguage())
    .catch((error) => {
      console.error('[Runtime] App bootstrap failed.', error);
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    ...(environment.production ? [provideClientHydration(withEventReplay())] : []),
    provideHttpClient(withFetch(), withInterceptors([draftConfigInterceptor])),
    provideAppInitializer(initializeRuntimeConfig),

    ...provideConditionHandlers(),
    ...provideEventHandlers(),
    ...provideValueHandlers(),

  ],
};
