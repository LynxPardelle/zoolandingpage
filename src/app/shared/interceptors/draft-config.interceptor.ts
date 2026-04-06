import { environment } from '@/environments/environment';
import { HttpInterceptorFn } from '@angular/common/http';

const CONFIG_ENDPOINTS = new Set([
    'page-config',
    'components',
    'variables',
    'angora-combos',
    'i18n',
]);

const getDraftUrl = (endpoint: string, params: URLSearchParams): string => {
    const base = String(environment.drafts.basePath ?? 'assets/drafts').replace(/^\/+/, '');
    const domain = String(params.get('domain') ?? '').trim();
    const pageId = String(params.get('pageId') ?? '').trim();

    if (!domain || !pageId) {
        return '';
    }

    if (endpoint === 'i18n') {
        const lang = params.get('lang') || 'es';
        return `${ base }/${ domain }/${ pageId }/i18n/${ lang }.json`;
    }

    return `${ base }/${ domain }/${ pageId }/${ endpoint }.json`;
};

const getEndpointName = (url: URL): string => url.pathname.replace(/\/+$/, '').split('/').pop() ?? '';

export const draftConfigInterceptor: HttpInterceptorFn = (req, next) => {
    if (!environment.drafts.enabled) return next(req);
    if (req.method !== 'GET') return next(req);

    const base = String(environment.apiUrl ?? '').replace(/\/+$/, '');
    const requestUrl = req.url ?? '';
    if (!requestUrl) return next(req);

    if (requestUrl.includes(environment.drafts.basePath)) {
        return next(req);
    }

    let url: URL | null = null;
    try {
        url = new URL(requestUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    } catch {
        return next(req);
    }

    if (base && url.origin !== new URL(base).origin) return next(req);

    const endpoint = getEndpointName(url);
    if (!CONFIG_ENDPOINTS.has(endpoint)) return next(req);

    const draftUrl = getDraftUrl(endpoint, url.searchParams);
    if (!draftUrl) return next(req);
    const redirected = req.clone({ url: draftUrl });
    return next(redirected);
};
