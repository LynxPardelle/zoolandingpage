import {
    findPublishedContentHubArticleForPath,
    isMissingPublishedContentHubArticlePath,
    matchContentHubArticleRoute,
    type TContentHubPublicRouteConfig,
} from './content-hub-public-route';

describe('content hub public route helpers', () => {
    const hubs: readonly TContentHubPublicRouteConfig[] = [
        {
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
    });

    it('marks article-looking paths as missing when no published article exists', () => {
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web/no-existe')).toBeTrue();
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web/borrador')).toBeTrue();
    });

    it('does not treat non-article blog paths as missing articles', () => {
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog')).toBeFalse();
        expect(isMissingPublishedContentHubArticlePath(hubs, '/blog/web')).toBeFalse();
    });
});
