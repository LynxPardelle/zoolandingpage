import { matchDraftRoute, normalizeDraftRoutePath } from './draft-route-matching';

describe('draft route matching', () => {
  const routes = [
    { path: '/blog/:categorySlug/:articleSlug', pageId: 'blog-article' },
    { path: '/blog/:categorySlug', pageId: 'blog-category' },
    { path: '/blog/web/blog-builder-seo', pageId: 'blog-builder-static' },
  ];

  it('normalizes route paths without query strings, hashes, duplicate slashes, or trailing slash noise', () => {
    expect(normalizeDraftRoutePath('blog//web/blog-builder-seo/?draftDomain=zoositioweb.com.mx#top'))
      .toBe('/blog/web/blog-builder-seo');
  });

  it('prefers exact routes over parameterized routes', () => {
    const match = matchDraftRoute(routes, '/blog/web/blog-builder-seo');

    expect(match?.route.pageId).toBe('blog-builder-static');
    expect(match?.params).toEqual({});
    expect(match?.exact).toBeTrue();
  });

  it('matches same-length parameterized routes and captures decoded route params', () => {
    const match = matchDraftRoute(routes.slice(0, 2), '/blog/desarrollo-web/seo%20tecnico');

    expect(match?.route.pageId).toBe('blog-article');
    expect(match?.params).toEqual({
      categorySlug: 'desarrollo-web',
      articleSlug: 'seo tecnico',
    });
    expect(match?.exact).toBeFalse();
  });

  it('does not match partial parameterized routes', () => {
    expect(matchDraftRoute(routes, '/blog/web/blog-builder-seo/extra')).toBeNull();
  });
});
