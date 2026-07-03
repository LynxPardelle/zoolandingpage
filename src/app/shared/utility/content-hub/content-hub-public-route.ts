import { matchDraftRoute, normalizeDraftRoutePath } from '../route-matching/draft-route-matching';

export type TContentHubPublicRouteArticle = {
    readonly articleId?: unknown;
    readonly status?: unknown;
    readonly visibility?: unknown;
    readonly path?: unknown;
    readonly categorySlug?: unknown;
    readonly tags?: unknown;
};

export type TContentHubPublicRouteConfig = {
    readonly articlePathPattern?: unknown;
    readonly publicArticles?: TContentHubPublicRouteCollection<TContentHubPublicRouteArticle>;
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
