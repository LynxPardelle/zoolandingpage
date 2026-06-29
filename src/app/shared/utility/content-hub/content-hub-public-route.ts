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
    readonly publicArticles?: readonly TContentHubPublicRouteArticle[];
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
        const articles = Array.isArray(hub.publicArticles) ? hub.publicArticles : [];
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
