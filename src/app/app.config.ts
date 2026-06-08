import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { RuntimeService } from '@/app/core/services/runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { ThemeService } from '@/app/shared/services/theme.service';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';

import {
  provideClientHydration,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { draftConfigInterceptor } from './shared/interceptors/draft-config.interceptor';
import { provideConditionHandlers } from './shared/utility/condition-handler/provide-condition-handlers';
import { provideEventHandlers } from './shared/utility/event-handler/provide-event-handlers';
import { provideValueHandlers } from './shared/utility/value-handler/provide-value-handlers';
import { provideAppState } from './state/app-state.providers';

export function initializeRuntimeConfig(): Promise<void> {
  const runtime = inject(RuntimeService);
  const language = inject(LanguageService);
  const theme = inject(ThemeService);
  return runtime
    .initialize(language.getRequestedLanguagePreference() ?? undefined)
    .then(() => {
      theme.applyTheme();
    })
    .catch((error) => {
      console.error('[Runtime] App bootstrap failed.', error);
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    ...(environment.production
      ? [provideClientHydration(withNoIncrementalHydration())]
      : []),
    provideRouter(routes),
    ...provideAppState({ production: environment.production }),
    provideHttpClient(withFetch(), withInterceptors([draftConfigInterceptor])),
    provideAppInitializer(initializeRuntimeConfig),

    ...provideConditionHandlers(),
    ...provideEventHandlers(),
    ...provideValueHandlers(),
  ],
};
