import { LanguageService } from '@/app/core/services/language.service';
import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

const asRecord = (v: unknown): Record<string, unknown> | undefined => {
    if (v && typeof v === 'object') return v as Record<string, unknown>;
    return undefined;
};

export const trackCtaClickHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'trackCTAClick',
        handle: (_ctx, args) => {
            const metaTitle = String(args[0] ?? '');
            const ctaType = String(args[1] ?? '');
            const location = String(args[2] ?? '');

            void analytics.track(metaTitle, {
                category: AnalyticsCategories.CTA,
                label: `${ location }:${ ctaType }`,
                meta: { location },
            });
        },
    };
};

export const trackNavClickHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);
    const language = inject(LanguageService);

    return {
        id: 'trackNavClick',
        handle: (_ctx, args) => {
            const key = String(args[0] ?? '').trim();
            const hrefStr = String(args[1] ?? '');

            const lang = language.currentLanguage();
            const labels: Record<string, string> =
                lang === 'en'
                    ? { home: 'Home', benefits: 'Benefits', process: 'Process', services: 'Services', contact: 'Contact' }
                    : { home: 'Inicio', benefits: 'Beneficios', process: 'Proceso', services: 'Servicios', contact: 'Contacto' };

            const label = labels[key] ?? (key || 'nav');

            void analytics.track(AnalyticsEvents.NavClick, {
                category: AnalyticsCategories.Navigation,
                label,
                meta: { href: hrefStr },
            });
        },
    };
};

export const trackFaqToggleHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'trackFaqToggle',
        handle: (_ctx, args) => {
            const evt = asRecord(args[0]);
            const expanded = Boolean(evt?.['expanded']);
            if (!expanded) return;

            const id = String(evt?.['id'] ?? 'unknown');

            void analytics.track(AnalyticsEvents.FaqOpen, {
                category: AnalyticsCategories.Faq,
                label: id,
            });
        },
    };
};

export const navigationToSectionHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);
    const doc = inject(DOCUMENT);

    return {
        id: 'navigationToSection',
        handle: (_ctx, args) => {
            const sectionId = String(args[0] ?? '').trim();
            if (!sectionId) return;

            // Keep parity with legacy behavior: suppress SectionView spam during programmatic scroll.
            try {
                const until = Date.now() + 500;
                analytics.suppress([AnalyticsEvents.SectionView], until);
            } catch {
                // no-op
            }

            try {
                const el = (doc as Document | null)?.getElementById(sectionId);
                if (!el) return;
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch {
                // no-op (SSR / non-browser)
            }
        },
    };
};
