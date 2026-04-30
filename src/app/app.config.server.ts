import { RuntimeService } from '@/app/core/services/runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { ApplicationConfig, inject, mergeApplicationConfig, provideAppInitializer } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Disable animations during server-side rendering for performance / determinism
    provideNoopAnimations(),
    provideAppInitializer(() => {
      const runtime = inject(RuntimeService);
      const language = inject(LanguageService);
      return runtime.initialize(language.currentLanguage())
        .catch((error) => {
          console.error('[Runtime] Server-side bootstrap failed.', error);
        });
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
