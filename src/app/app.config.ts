import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, ENVIRONMENT_INITIALIZER, inject, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { I18nService } from './core/services/i18n.service';
import { I18N_CONFIG } from './landing-page/components/landing-page/i18n.constants';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    provideClientHydration(withEventReplay()),
    // Enable browser animations (component triggers rely on this)
    provideAnimations(),
    provideHttpClient(withFetch()),
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const i18n = inject(I18nService);
        // Expose landing-page translations under `landing.*`
        i18n.registerNamespace('landing', I18N_CONFIG.translations as any);
      },
    },
  ],
};
