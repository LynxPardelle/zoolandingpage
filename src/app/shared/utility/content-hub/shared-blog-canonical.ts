import { normalizeDraftRoutePath } from '../route-matching/draft-route-matching';
import { normalizeLocaleCode } from '../../i18n/locale.utils';
import { matchContentHubArticleRoute, type TContentHubPublicRouteArticle, type TContentHubPublicRouteCollection } from './content-hub-public-route';

type Delivery = { readonly path?: unknown; readonly canonicalPath?: unknown; readonly robots?: unknown };
type SharedBlogSource = {
    readonly hubId?: string;
    readonly ownerDraftDomain?: string;
    readonly source?: string;
    readonly canonicalMode?: string;
    readonly routeBasePath?: string;
    readonly articlePathPattern?: string;
    readonly publicArticles?: TContentHubPublicRouteCollection<TSharedArticle>;
};
type TSharedArticle = TContentHubPublicRouteArticle & Delivery & { readonly locale?: unknown; readonly primarySite?: unknown };

export type TSharedContentHubArticleSeo = {
    readonly canonical: string;
    readonly robots: 'index,follow' | 'index,nofollow' | 'noindex,follow' | 'noindex,nofollow';
};

const DOMAIN_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const SAFE_PATH = /^\/(?!\/)[^\\\s\u0000-\u001f\u007f]*$/;
const ZOOSITE = 'zoositioweb.com.mx';
const ZOOBERIAH = 'zooberiahsystems.com';

function isZoositeDelivery(hub: SharedBlogSource, domain: string): boolean {
    return hub.hubId === 'zoosite-main' && hub.ownerDraftDomain === ZOOSITE && (
        (domain === ZOOSITE && hub.source === 'primary')
        || (domain === ZOOBERIAH && hub.source === 'authorized' && hub.canonicalMode === 'noindex-shared')
    );
}

function safePath(value: unknown): string | undefined {
    return typeof value === 'string' && SAFE_PATH.test(value) ? value : undefined;
}

export function resolveSharedContentHubArticleSeo(
    site: { readonly domain?: string; readonly runtime?: { readonly contentHubs?: readonly SharedBlogSource[] | SharedBlogSource } } | null | undefined,
    requestPath: string,
    language?: string,
    articleId?: string,
    pageRobots?: string,
): TSharedContentHubArticleSeo | null {
    const domain = typeof site?.domain === 'string' ? site.domain.toLowerCase() : '';
    const hubs = site?.runtime?.contentHubs;
    if (!domain || !hubs) return null;
    const sources = [hubs].flat();
    if (!sources.some(hub => hub && (isZoositeDelivery(hub, domain)
        || (hub.source === 'authorized' && hub.canonicalMode === 'noindex-shared')))) return null;
    const path = normalizeDraftRoutePath(requestPath);
    const lang = normalizeLocaleCode(language);
    const matchesPath = (entry: Delivery | null | undefined) => safePath(entry?.path) !== undefined
        && normalizeDraftRoutePath(entry?.path) === path;
    let match: { hub: SharedBlogSource; article: TSharedArticle; localized?: Delivery; rank: number } | undefined;

    for (const hub of sources) {
        const articles = hub?.publicArticles;
        const items = articles && ('items' in articles ? articles.items : articles);
        if (!items || !Array.isArray(items)) continue;
        for (const article of items) {
            if (article?.status !== 'published' || (article.visibility !== undefined && article.visibility !== 'public')) continue;
            if (articleId && article.articleId !== articleId) continue;
            const localizations = article.localizations && typeof article.localizations === 'object'
                ? Object.entries(article.localizations as Record<string, Delivery>) : [];
            const isBasePath = matchesPath(article);
            const requestedLocale = lang ? localizations.find(([locale]) => normalizeLocaleCode(locale) === lang)?.[1] : undefined;
            const preferred = normalizeLocaleCode(article.locale) === lang
                ? isBasePath : !!requestedLocale && (matchesPath(requestedLocale) || (!requestedLocale.path && isBasePath));
            const localized = preferred && requestedLocale ? requestedLocale
                : isBasePath ? undefined : localizations.find(([, entry]) => matchesPath(entry))?.[1];
            if (!localized && !isBasePath) continue;
            const rank = preferred ? 2 : isBasePath ? 1 : 0;
            if (!match || rank > match.rank) match = { hub, article, localized, rank };
        }
    }
    if (!match) return null;

    // Apply the policy of the hub that actually supplied the article.
    const { hub, article, localized } = match;
    const primary = article.primarySite;
    if (isZoositeDelivery(hub, domain) && (primary === ZOOSITE || primary === ZOOBERIAH)
        && /^\/blog\/[a-z0-9-]+\/[a-z0-9-]+$/.test(path) && matchContentHubArticleRoute([hub], path)) {
        const robots = localized?.robots ?? article.robots;
        const directives = [robots, pageRobots].flatMap(value =>
            typeof value === 'string' ? value.toLowerCase().split(',').map(part => part.trim()) : []);
        const noindex = primary !== domain || directives.includes('noindex') || directives.includes('none');
        const nofollow = directives.includes('nofollow') || directives.includes('none');
        return {
            canonical: `https://${ primary }${ path }`,
            robots: `${ noindex ? 'noindex' : 'index' },${ nofollow ? 'nofollow' : 'follow' }`,
        };
    }
    const owner = typeof hub.ownerDraftDomain === 'string' ? hub.ownerDraftDomain.toLowerCase() : '';
    if (hub.source !== 'authorized' || hub.canonicalMode !== 'noindex-shared'
        || !owner || owner === domain || owner.length > 253 || !DOMAIN_NAME.test(owner)
        || !matchContentHubArticleRoute([hub], path)) return null;

    const canonicalPath = safePath(localized?.canonicalPath) ?? safePath(localized?.path)
        ?? safePath(article.canonicalPath) ?? safePath(article.path);
    if (!canonicalPath) return null;
    const sourceRobots = localized?.robots ?? article.robots;
    const nofollow = typeof sourceRobots === 'string'
        && /(?:^|,)\s*(?:nofollow|none)\s*(?:,|$)/i.test(sourceRobots);
    try {
        return { canonical: new URL(canonicalPath, `https://${ owner }`).href, robots: nofollow ? 'noindex,nofollow' : 'noindex,follow' };
    } catch {
        return null;
    }
}
