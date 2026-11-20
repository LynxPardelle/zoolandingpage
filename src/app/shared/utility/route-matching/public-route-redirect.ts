import type { TPublicRouteRedirect } from '../../types/config-payloads.types';

const STATIC_PATH = /^(?!.*(?:^|\/)\.{1,2}(?:\/|$))\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?)?$/;
const PARAMETER_NAME = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const PREVIEW_PARAMETERS = new Set(['draftDomain', 'draftPageId', 'debugWorkspace']);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const normalizePath = (path: string): string => path.replace(/\/$/, '') || '/';
const isStaticPath = (value: unknown): value is string => typeof value === 'string' && value.length <= 256 && STATIC_PATH.test(value);

/** A closed, opt-in table. Reject the whole table rather than follow a partial/ambiguous chain. */
export function isPublicRouteRedirects(value: unknown, routes?: readonly unknown[]): value is readonly TPublicRouteRedirect[] {
    if (!Array.isArray(value) || value.length > 32) return false;
    const sources = new Set<string>();
    for (const entry of value) {
        if (!isRecord(entry) || Object.keys(entry).some(key => !['from', 'to', 'preserveQueryParams'].includes(key))) return false;
        if (!isStaticPath(entry['from']) || !isStaticPath(entry['to'])) return false;
        const from = normalizePath(entry['from']);
        if (from === normalizePath(entry['to']) || sources.has(from)) return false;
        sources.add(from);
        const params = entry['preserveQueryParams'];
        if (params !== undefined && (!Array.isArray(params) || params.length > 8 || new Set(params).size !== params.length
            || !params.every(name => typeof name === 'string' && PARAMETER_NAME.test(name) && !PREVIEW_PARAMETERS.has(name)))) return false;
    }
    const targets = routes?.filter(isRecord).map(route => route['path']).filter(isStaticPath).map(normalizePath);
    return value.every(entry => !sources.has(normalizePath(entry.to))
        && (!targets || targets.includes(normalizePath(entry.to))));
}

/** Returns a same-origin relative Location; never accepts an authored origin or caller-supplied page ID. */
export function resolvePublicRouteRedirect(
    siteConfig: unknown,
    requestUrl: string,
    options: { readonly allowDraftPreview?: boolean } = {},
): string | null {
    if (!isRecord(siteConfig) || !Array.isArray(siteConfig['routes'])) return null;
    const site = siteConfig['site'];
    const seo = isRecord(site) ? site['seo'] : undefined;
    const redirects = isRecord(seo) ? seo['redirects'] : undefined;
    if (!isPublicRouteRedirects(redirects, siteConfig['routes'])) return null;
    // URL() normalizes dot segments and treats a leading // as another authority.
    // A raw server request must match the authored static source before that normalization.
    if (requestUrl.startsWith('/') && !isStaticPath(requestUrl.split(/[?#]/, 1)[0])) return null;
    let url: URL;
    try { url = new URL(requestUrl, 'https://redirect.invalid'); } catch { return null; }
    const redirect = redirects.find(entry => normalizePath(entry.from) === normalizePath(url.pathname));
    if (!redirect) return null;
    const query = new URLSearchParams();
    for (const name of redirect.preserveQueryParams ?? []) {
        // Duplicate/structured values are intentionally not promoted into the new canonical URL.
        const values = url.searchParams.getAll(name);
        if (values.length === 1 && values[0].length <= 1024) query.set(name, values[0]);
    }
    const domain = typeof siteConfig['domain'] === 'string' ? siteConfig['domain'].toLowerCase() : '';
    const environments = isRecord(siteConfig['environments']) ? Object.values(siteConfig['environments']) : [];
    const aliases = [siteConfig['aliases'], ...environments.filter(isRecord).map(value => value['aliases'])]
        .filter(Array.isArray).flat().filter((value): value is string => typeof value === 'string').map(value => value.toLowerCase());
    const previewDomains = url.searchParams.getAll('draftDomain');
    if (options.allowDraftPreview && domain && previewDomains.length === 1 && [domain, ...aliases].includes(previewDomains[0].toLowerCase())) {
        query.set('draftDomain', domain);
        const debug = url.searchParams.getAll('debugWorkspace');
        if (debug.length === 1 && ['true', 'false'].includes(debug[0])) query.set('debugWorkspace', debug[0]);
    }
    const search = query.toString();
    return `${ normalizePath(redirect.to) }${ search ? `?${ search }` : '' }${ url.hash }`;
}
