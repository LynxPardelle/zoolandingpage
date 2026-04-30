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

function scrollHashIntoView(hash: string): void {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function navigateInCurrentWindow(href: string): void {
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
        }
        return;
    }

    window.history.pushState({}, '', nextPath);
    if (nextUrl.hash) {
        scrollHashIntoView(nextUrl.hash);
    }
    dispatchClientNavigation();
}
