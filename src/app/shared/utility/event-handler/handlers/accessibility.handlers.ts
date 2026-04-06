import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const skipToMainHandler = (): EventHandler => {
    const doc = inject(DOCUMENT);

    return {
        id: 'skipToMain',
        handle: (_ctx, args) => {
            const id = String(args[0] ?? '').trim();
            if (!id) return;

            try {
                const el = (doc as Document | null)?.getElementById(id) as HTMLElement | null;
                if (!el) return;

                // Match typical skip-link behavior: jump to main and move focus.
                el.scrollIntoView({ behavior: 'auto', block: 'start' });
                el.focus();
            } catch {
                // no-op (SSR / non-browser)
            }
        },
    };
};

export const scrollToSectionHandler = (): EventHandler => {
    const doc = inject(DOCUMENT);

    return {
        id: 'scrollToSection',
        handle: (_ctx, args) => {
            const rawId = String(args[0] ?? '').trim();
            if (!rawId) return;

            const normalized = rawId.startsWith('#') ? rawId.slice(1) : rawId;

            try {
                const el = (doc as Document | null)?.getElementById(normalized);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch {
                // no-op (SSR / non-browser)
            }
        },
    };
};
