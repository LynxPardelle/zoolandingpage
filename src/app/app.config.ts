import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { RuntimeService } from '@/app/core/services/runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';

import { provideClientHydration } from '@angular/platform-browser';
import { environment } from '../environments/environment';
import { draftConfigInterceptor } from './shared/interceptors/draft-config.interceptor';
import { provideConditionHandlers } from './shared/utility/condition-handler/provide-condition-handlers';
import { provideEventHandlers } from './shared/utility/event-handler/provide-event-handlers';
import { provideValueHandlers } from './shared/utility/value-handler/provide-value-handlers';


export function initializeRuntimeConfig(): Promise<void> {
  const runtime = inject(RuntimeService);
  const language = inject(LanguageService);
  return runtime.initialize(language.getRequestedLanguagePreference() ?? undefined)
    .catch((error) => {
      console.error('[Runtime] App bootstrap failed.', error);
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    ...(environment.production ? [provideClientHydration()] : []),
    provideHttpClient(withFetch(), withInterceptors([draftConfigInterceptor])),
    provideAppInitializer(initializeRuntimeConfig),

    ...provideConditionHandlers(),
    ...provideEventHandlers(),
    ...provideValueHandlers(),

  ],
};
