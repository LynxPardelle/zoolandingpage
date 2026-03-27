import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

const asRecord = (v: unknown): Record<string, unknown> | undefined => {
    if (v && typeof v === 'object') return v as Record<string, unknown>;
    return undefined;
};

const normalizeAnalyticsLabel = (value: unknown): string | undefined => {
    if (value == null) return undefined;

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    const normalized = String(value).trim();
    if (!normalized) return undefined;

    const numericSuffix = normalized.match(/(\d+)$/);
    return numericSuffix?.[1] ?? normalized;
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

    return {
        id: 'trackNavClick',
        handle: (_ctx, args) => {
            const key = String(args[0] ?? '').trim();
            const hrefStr = String(args[1] ?? '');
            const normalizedHref = hrefStr.replace(/^#/, '').trim();
            const label = key || normalizedHref || 'nav';

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

export const trackProcessStepChangeHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'trackProcessStepChange',
        handle: (_ctx, args) => {
            const label = normalizeAnalyticsLabel(args?.[0]);
            if (!label) return;

            void analytics.track(AnalyticsEvents.ProcessStepChange, {
                category: AnalyticsCategories.Process,
                label,
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
            const sectionArg = String(args[0] ?? '').trim();
            const sectionId = sectionArg.replace(/^#/, '');
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
