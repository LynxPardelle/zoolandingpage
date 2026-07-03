import { matchDraftRoute, normalizeDraftRoutePath } from '../route-matching/draft-route-matching';

export type TContentHubPublicRouteArticle = {
    readonly articleId?: unknown;
    readonly status?: unknown;
    readonly visibility?: unknown;
    readonly path?: unknown;
    readonly categorySlug?: unknown;
    readonly tags?: unknown;
};

export type TContentHubPublicRouteTaxonomy = {
    readonly kind?: unknown;
    readonly slug?: unknown;
    readonly path?: unknown;
    readonly visible?: unknown;
};

export type TContentHubPublicRouteConfig = {
    readonly routeBasePath?: unknown;
    readonly articlePathPattern?: unknown;
    readonly publicArticles?: TContentHubPublicRouteCollection<TContentHubPublicRouteArticle>;
    readonly publicTaxonomy?: TContentHubPublicRouteCollection<TContentHubPublicRouteTaxonomy>;
};

export type TContentHubPublicRouteCollection<T> = readonly T[] | {
    readonly items?: readonly T[];
};

export type TContentHubArticleRouteMatch = {
    readonly hub: TContentHubPublicRouteConfig;
    readonly params: Readonly<Record<string, string>>;
};

export function matchContentHubArticleRoute(
    hubs: readonly TContentHubPublicRouteConfig[] | null | undefined,
    path: unknown,
): TContentHubArticleRouteMatch | null {
    if (!Array.isArray(hubs)) {
        return null;
    }

    const normalizedPath = normalizeDraftRoutePath(path);
    for (const hub of hubs) {
        if (isReservedTaxonomyPath(hub, normalizedPath)) {
            continue;
        }

        const pattern = String(hub.articlePathPattern ?? '').trim();
        if (!pattern) {
            continue;
        }

        const match = matchDraftRoute([{ path: pattern }], normalizedPath);
        if (match) {
            return {
                hub,
                params: match.params,
            };
        }
    }

    return null;
}

export function findPublishedContentHubArticleForPath(
    hubs: readonly TContentHubPublicRouteConfig[] | null | undefined,
    path: unknown,
): TContentHubPublicRouteArticle | null {
    if (!Array.isArray(hubs)) {
        return null;
    }

    const normalizedPath = normalizeDraftRoutePath(path);
    for (const hub of hubs) {
        const articles = readContentHubPublicRouteCollection<TContentHubPublicRouteArticle>(hub.publicArticles);
        const article = articles.find((entry: TContentHubPublicRouteArticle) => entry.status === 'published'
            && (entry.visibility === undefined || entry.visibility === 'public')
            && normalizeDraftRoutePath(entry.path) === normalizedPath);
        if (article) {
            return article;
        }
    }

    return null;
}

export function isMissingPublishedContentHubArticlePath(
    hubs: readonly TContentHubPublicRouteConfig[] | null | undefined,
    path: unknown,
): boolean {
    return !!matchContentHubArticleRoute(hubs, path) && !findPublishedContentHubArticleForPath(hubs, path);
}

export function isMissingPublishedContentHubPublicPath(
    hubs: readonly TContentHubPublicRouteConfig[] | null | undefined,
    path: unknown,
): boolean {
    if (isMissingPublishedContentHubArticlePath(hubs, path)) {
        return true;
    }

    const taxonomyRoute = matchContentHubTaxonomyRoute(hubs, path);
    return !!taxonomyRoute && !hasVisibleContentHubTaxonomyRoute(taxonomyRoute);
}

function readContentHubPublicRouteCollection<T>(
    collection: TContentHubPublicRouteCollection<T> | null | undefined,
): readonly T[] {
    if (Array.isArray(collection)) {
        return collection;
    }

    const indexedCollection = collection as { readonly items?: unknown };
    return !!collection && typeof collection === 'object' && Array.isArray(indexedCollection.items)
        ? indexedCollection.items as readonly T[]
        : [];
}

function matchContentHubTaxonomyRoute(
    hubs: readonly TContentHubPublicRouteConfig[] | null | undefined,
    path: unknown,
): { readonly hub: TContentHubPublicRouteConfig; readonly kind: 'category' | 'tag'; readonly slug: string; readonly path: string } | null {
    if (!Array.isArray(hubs)) {
        return null;
    }

    const normalizedPath = normalizeDraftRoutePath(path);
    for (const hub of hubs) {
        const basePath = contentHubBasePath(hub);
        if (!basePath || normalizedPath === basePath || !normalizedPath.startsWith(`${ basePath }/`)) {
            continue;
        }

        const segments = normalizedPath.slice(basePath.length + 1).split('/').filter(Boolean);
        if (segments.length === 1) {
            return { hub, kind: 'category', slug: cleanSlug(segments[0]), path: normalizedPath };
        }

        if (segments.length === 2 && segments[0] === 'tag') {
            return { hub, kind: 'tag', slug: cleanSlug(segments[1]), path: normalizedPath };
        }
    }

    return null;
}

function hasVisibleContentHubTaxonomyRoute(route: {
    readonly hub: TContentHubPublicRouteConfig;
    readonly kind: 'category' | 'tag';
    readonly slug: string;
    readonly path: string;
}): boolean {
    const taxonomies = readContentHubPublicRouteCollection<TContentHubPublicRouteTaxonomy>(route.hub.publicTaxonomy);
    if (taxonomies.some((entry) => entry.visible !== false
        && cleanSlug(entry.kind) === route.kind
        && (cleanSlug(entry.slug) === route.slug || normalizeDraftRoutePath(entry.path) === route.path))) {
        return true;
    }

    const articles = readContentHubPublicRouteCollection<TContentHubPublicRouteArticle>(route.hub.publicArticles)
        .filter((entry) => entry.status === 'published' && (entry.visibility === undefined || entry.visibility === 'public'));

    if (route.kind === 'category') {
        return articles.some((entry) => cleanSlug(entry.categorySlug) === route.slug);
    }

    return articles.some((entry) => Array.isArray(entry.tags)
        && entry.tags.some((tag) => cleanSlug(tag) === route.slug));
}

function isReservedTaxonomyPath(hub: TContentHubPublicRouteConfig, path: string): boolean {
    const basePath = contentHubBasePath(hub);
    return !!basePath && path.startsWith(`${ basePath }/tag/`);
}

function contentHubBasePath(hub: TContentHubPublicRouteConfig): string {
    const configured = normalizeDraftRoutePath(hub.routeBasePath);
    if (configured !== '/') {
        return configured;
    }

    const pattern = normalizeDraftRoutePath(hub.articlePathPattern);
    const segments = pattern.split('/').filter(Boolean);
    const staticSegments: string[] = [];
    for (const segment of segments) {
        if (segment.startsWith(':')) {
            break;
        }
        staticSegments.push(segment);
    }

    return staticSegments.length ? `/${ staticSegments.join('/') }` : '';
}

function cleanSlug(value: unknown): string {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
