import {
    findPublishedContentHubArticleForPath,
    isMissingPublishedContentHubArticlePath,
    isMissingPublishedContentHubPublicPath,
    matchContentHubArticleRoute,
    type TContentHubPublicRouteArticle,
    type TContentHubPublicRouteConfig,
} from './content-hub-public-route';

describe('content hub public route helpers', () => {
    const hubs: readonly TContentHubPublicRouteConfig[] = [
        {
            routeBasePath: '/blog',
            articlePathPattern: '/blog/:categorySlug/:articleSlug',
            publicArticles: [
                {
                    articleId: 'art_public',
                    status: 'published',
                    path: '/blog/web/guia-seo',
                    categorySlug: 'web',
                    tags: ['seo'],
                },
                {
                    articleId: 'art_draft',
                    status: 'draft',
                    path: '/blog/web/borrador',
                    categorySlug: 'web',
                    tags: ['draft'],
                },
                {
                    articleId: 'art_private',
                    status: 'published',
                    visibility: 'private',
                    path: '/blog/web/privado',
                    categorySlug: 'web',
                    tags: ['private'],
                },
            ],
            publicTaxonomy: [
                {
                    kind: 'category',
                    slug: 'web',
                    visible: true,
                    path: '/blog/web',
                },
                {
                    kind: 'tag',
                    slug: 'seo',
                    visible: true,
                },
            ],
        },
    ];

    it('matches configured article path patterns and exposes route params', () => {
        const match = matchContentHubArticleRoute(hubs, '/blog/web/guia-seo');

        expect(match?.params).toEqual({ categorySlug: 'web', articleSlug: 'guia-seo' });
    });

    it('finds only published articles for public article paths', () => {
        expect(findPublishedContentHubArticleForPath(hubs, '/blog/web/guia-seo')?.articleId).toBe('art_public');
        expect(findPublishedContentHubArticleForPath(hubs, '/blog/web/borrador')).toBeNull();
        expect(findPublishedContentHubArticleForPath(hubs, '/blog/web/privado')).toBeNull();
    });

    it('supports runtime public article collections with items', () => {
        const articles = hubs[0].publicArticles;
        expect(Array.isArray(articles)).toBeTrue();
        const runtimeIndexedHubs: readonly TContentHubPublicRouteConfig[] = [
            {
                ...hubs[0],
                publicArticles: {
                    items: articles as readonly TContentHubPublicRouteArticle[],
                },
            },
        ];

        expect(findPublishedContentHubArticleForPath(runtimeIndexedHubs, '/blog/web/guia-seo')?.articleId).toBe('art_public');
        expect(isMissingPublishedContentHubArticlePath(runtimeIndexedHubs, '/blog/web/guia-seo')).toBeFalse();
    });

    it('marks article-looking paths as missing when no published article exists', () => {
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web/no-existe')).toBeTrue();
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web/borrador')).toBeTrue();
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web/privado')).toBeTrue();
    });

    it('does not treat non-article blog paths as missing articles', () => {
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog')).toBeFalse();
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web')).toBeFalse();
    });

    it('marks category and tag listing paths as missing only when no public taxonomy or article exists', () => {
        expect(isMissingPublishedContentHubPublicPath(hubs, '/blog')).toBeFalse();
        expect(isMissingPublishedContentHubPublicPath(hubs, '/blog/web')).toBeFalse();
        expect(isMissingPublishedContentHubPublicPath(hubs, '/blog/tag/seo')).toBeFalse();
        expect(isMissingPublishedContentHubPublicPath(hubs, '/blog/bienvenido-al-blog-de-zoosite')).toBeTrue();
        expect(isMissingPublishedContentHubPublicPath(hubs, '/blog/tag/no-existe')).toBeTrue();
    });

    it('does not let reserved tag routes masquerade as article routes', () => {
        expect(matchContentHubArticleRoute(hubs, '/blog/tag/seo')).toBeNull();
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/tag/seo')).toBeFalse();
    });
});
