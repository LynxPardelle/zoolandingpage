import type { TDraftNavigationScrollRestorationConfig } from '../../types/config-payloads.types';

export const CLIENT_NAVIGATION_START_EVENT = 'zlp:client-navigation-start';
export const CLIENT_NAVIGATION_END_EVENT = 'zlp:client-navigation-end';

export function currentBrowserPath(): string {
    if (typeof window === 'undefined' || !window.location) {
        return '/';
    }

    return `${ window.location.pathname || '/' }${ window.location.search || '' }${ window.location.hash || '' }`;
}

function dispatchClientNavigation(): void {
    const event = typeof PopStateEvent === 'function'
        ? new PopStateEvent('popstate', { state: window.history.state })
        : new Event('popstate');
    window.dispatchEvent(event);
}

export function dispatchClientNavigationEnd(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new Event(CLIENT_NAVIGATION_END_EVENT));
}

function dispatchClientNavigationStart(): void {
    window.dispatchEvent(new Event(CLIENT_NAVIGATION_START_EVENT));
}

function scrollHashIntoView(hash: string): void {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function numericOrFallback(value: number | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function applyNavigationScroll(scrollRestoration?: TDraftNavigationScrollRestorationConfig): void {
    const mode = scrollRestoration?.mode ?? 'preserve';
    if (mode === 'preserve') {
        return;
    }

    const top = mode === 'top' ? 0 : numericOrFallback(scrollRestoration?.top, 0);
    const left = numericOrFallback(scrollRestoration?.left, 0);
    const behavior = scrollRestoration?.behavior ?? 'auto';
    if (behavior !== 'smooth') {
        for (const element of [document.scrollingElement, document.documentElement, document.body]) {
            if (!element) {
                continue;
            }

            element.scrollTop = top;
            element.scrollLeft = left;
        }
    }

    window.scrollTo({ top, left, behavior });
}

export function navigateInCurrentWindow(
    href: string,
    options: { readonly scrollRestoration?: TDraftNavigationScrollRestorationConfig } = {},
): void {
    if (typeof window === 'undefined' || !window.location) {
        return;
    }

    const normalizedHref = String(href ?? '').trim();
    if (!normalizedHref) {
        return;
    }

    const nextUrl = new URL(normalizedHref, window.location.href);

    if (nextUrl.origin !== window.location.origin) {
        window.location.assign(nextUrl.toString());
        return;
    }

    const nextPath = `${ nextUrl.pathname || '/' }${ nextUrl.search || '' }${ nextUrl.hash || '' }`;
    if (nextPath === currentBrowserPath()) {
        if (nextUrl.hash) {
            scrollHashIntoView(nextUrl.hash);
        } else {
            applyNavigationScroll(options.scrollRestoration);
        }
        return;
    }

    dispatchClientNavigationStart();
    window.history.pushState({}, '', nextPath);
    if (nextUrl.hash) {
        scrollHashIntoView(nextUrl.hash);
    } else {
        applyNavigationScroll(options.scrollRestoration);
    }
    dispatchClientNavigation();
}
