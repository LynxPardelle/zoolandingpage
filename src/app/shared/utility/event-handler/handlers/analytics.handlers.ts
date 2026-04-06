import { AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

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

const normalizeString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return normalizeAnalyticsLabel(value);
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
};

const buildMeta = (args: readonly unknown[], startIndex: number): Record<string, unknown> | undefined => {
    const meta: Record<string, unknown> = {};

    for (let index = startIndex; index < args.length; index += 2) {
        const key = normalizeString(args[index]);
        if (!key) continue;
        meta[key] = args[index + 1];
    }

    return Object.keys(meta).length > 0 ? meta : undefined;
};

export const trackEventHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'trackEvent',
        handle: (_ctx, args) => {
            const name = normalizeString(args[0]);
            if (!name) return;

            const category = normalizeString(args[1]);
            const label = normalizeString(args[2]);
            const meta = buildMeta(args, 3);

            void analytics.track(name, {
                category,
                label,
                meta,
            });
        },
    };
};

export const trackEventWhenHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'trackEventWhen',
        handle: (_ctx, args) => {
            const actual = args[0];
            const expected = args[1];
            if (actual !== expected) return;

            const name = normalizeString(args[2]);
            if (!name) return;

            const category = normalizeString(args[3]);
            const label = normalizeString(args[4]);
            const meta = buildMeta(args, 5);

            void analytics.track(name, {
                category,
                label,
                meta,
            });
        },
    };
};

export const trackNumericSuffixEventHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'trackNumericSuffixEvent',
        handle: (_ctx, args) => {
            const name = normalizeString(args[0]);
            if (!name) return;

            const category = normalizeString(args[1]);
            const label = normalizeAnalyticsLabel(args[2]);
            if (!label) return;

            const meta = buildMeta(args, 3);

            void analytics.track(name, {
                category,
                label,
                meta,
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
