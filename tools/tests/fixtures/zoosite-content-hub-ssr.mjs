// Synthetic, repository-owned data for SSR discovery and rendering tests.
// The raw index deliberately contains a private article. Render-bundle callers
// must project only published public records before Angular validates the bundle.
export function createZoositeContentHubFixture() {
  const domain = 'zoositioweb.com.mx';
  const origin = `https://${domain}`;
  const identity = pageId => ({ version: 1, domain, pageId });
  const palette = {
    bgColor: '#ffffff',
    textColor: '#111827',
    titleColor: '#111827',
    linkColor: '#1d4ed8',
    accentColor: '#1d4ed8',
    secondaryBgColor: '#f3f4f6',
    secondaryTextColor: '#374151',
    secondaryTitleColor: '#111827',
    secondaryLinkColor: '#1d4ed8',
    secondaryAccentColor: '#1e40af',
    successColor: '#166534',
    onSuccessColor: '#ffffff',
    errorColor: '#991b1b',
    onErrorColor: '#ffffff',
    warningColor: '#854d0e',
    onWarningColor: '#ffffff',
    infoColor: '#075985',
    onInfoColor: '#ffffff',
  };
  const localSiteConfig = {
    version: 1,
    domain,
    aliases: [domain],
    defaultPageId: 'default',
    notFoundPageId: 'not-found',
    routes: [
      { path: '/', pageId: 'default' },
      { path: '/blog', pageId: 'blog' },
      { path: '/blogs', pageId: 'blogs' },
      { path: '/blog/tag/:tagSlug', pageId: 'blog' },
      { path: '/blog/:categorySlug', pageId: 'blog-category' },
      { path: '/blog/:categorySlug/:articleSlug', pageId: 'blog-article' },
      { path: '/admin/blog/articulos', pageId: 'private-blog-admin', auth: { required: true } },
      { path: '/404', pageId: 'not-found' },
    ],
    sitemap: {
      urls: ['/', '/blog', '/blogs'],
      excludePaths: [
        '/admin/blog/articulos', '/blog/tag/:tagSlug',
        '/blog/:categorySlug', '/blog/:categorySlug/:articleSlug',
      ],
    },
    site: {
      appIdentity: { identifier: 'zoosite-ssr-fixture', name: 'zoositioweb' },
      theme: {
        defaultMode: 'light',
        palettes: {
          light: { ...palette },
          dark: { ...palette, bgColor: '#111827', textColor: '#ffffff', titleColor: '#ffffff' },
        },
      },
      i18n: { defaultLanguage: 'es', supportedLanguages: ['es', 'en'] },
      seo: {
        siteName: 'zoositioweb',
        title: 'zoositioweb',
        description: 'Artículos de zoositioweb sobre sitios web, SEO, analítica y crecimiento digital.',
        canonicalOrigin: origin,
        robots: 'index,follow',
        defaultImage: 'https://assets.example.com/zoosite-site-card.webp',
      },
    },
    runtime: {
      contentHubs: [{
        hubId: 'zoosite-main',
        ownerDraftDomain: domain,
        source: 'primary',
        canonicalMode: 'host-adaptive',
        routeBasePath: '/blog',
        listPath: '/blog',
        articlePathPattern: '/blog/:categorySlug/:articleSlug',
        defaultLocale: 'es',
        locales: ['es', 'en'],
        publicTaxonomy: [
          { taxonomyId: 'web', kind: 'category', slug: 'web', label: 'Web', locale: 'es', visible: true, path: '/blog/web' },
          { taxonomyId: 'seo', kind: 'tag', slug: 'seo', label: 'SEO', locale: 'es', visible: true, path: '/blog/tag/seo' },
        ],
        publicArticles: [
          {
            articleId: 'art_welcome_fixture',
            locale: 'es',
            status: 'published',
            visibility: 'public',
            title: 'Bienvenido al blog de Zoosite',
            summary: 'Noticias y recursos para crear un sitio web.',
            path: '/blog/web/bienvenido-al-blog-de-zoosite',
            categorySlug: 'web',
            tags: ['bienvenida'],
            publishedAt: '2026-06-19T12:00:00.000Z',
            canonicalPath: '/blog/web/bienvenido-al-blog-de-zoosite',
            robots: 'index,follow',
          },
          {
            articleId: 'art_blog_builder_fixture',
            locale: 'es',
            status: 'published',
            visibility: 'public',
            title: 'Cómo crear artículos visuales con Zoosite',
            summary: 'Una guía de artículos visuales para el blog y sus componentes.',
            path: '/blog/web/blog-builder-seo',
            categorySlug: 'web',
            tags: ['seo', 'blog-builder', 'guias', 'componentes'],
            publishedAt: '2026-06-20T12:00:00.000Z',
            updatedAt: '2026-06-20T12:30:00.000Z',
            canonicalPath: '/blog/web/blog-builder-seo',
            robots: 'index,follow',
            imageSrc: 'https://assets.example.com/blog-builder-cover.webp',
            imageAlt: 'Componentes de un artículo visual',
          },
          {
            articleId: 'art_private_fixture',
            locale: 'es',
            status: 'published',
            visibility: 'private',
            title: 'Privado no publicable',
            summary: 'Artículo privado de artículos visuales que no debe aparecer en resultados públicos.',
            path: '/blog/web/privado-no-publicable',
            categorySlug: 'web',
            tags: ['seo', 'private-fixture'],
            publishedAt: '2026-06-21T12:00:00.000Z',
          },
        ],
      }],
    },
  };

  const localBlogPageConfig = {
    ...identity('blog'),
    rootIds: ['fixtureBlogHeading', 'fixtureBlogArticles'],
    seo: {
      title: 'Blog | zoositioweb',
      description: 'Artículos de zoositioweb sobre sitios web, SEO, analítica y crecimiento digital.',
      canonical: `${origin}/blog`,
      robots: 'index,follow,max-image-preview:large',
    },
  };
  const localBlogComponents = {
    ...identity('blog'),
    components: [
      { id: 'fixtureBlogHeading', type: 'text', config: { tag: 'h1', text: 'Blog de zoositioweb' } },
      {
        id: 'fixtureBlogArticles',
        type: 'container',
        loopConfig: {
          source: 'var',
          path: 'contentHub.publicArticles.items',
          templateId: 'fixtureArticleLinkTemplate',
          idPrefix: 'fixtureArticleLink',
          bindings: [
            { to: 'config.text', sources: ['title'] },
            { to: 'config.href', sources: ['path'] },
          ],
        },
        config: { tag: 'nav', ariaLabel: 'Artículos publicados', components: [] },
      },
      { id: 'fixtureArticleLinkTemplate', type: 'link', config: { href: '/', text: '' } },
    ],
  };
  const localNotFoundPageConfig = {
    ...identity('not-found'),
    rootIds: ['fixtureMissingTitle'],
    seo: {
      title: 'Página no encontrada | zoositioweb',
      description: 'La página solicitada no está publicada.',
      canonical: `${origin}/404`,
      robots: 'noindex,nofollow',
    },
  };
  const localNotFoundComponents = {
    ...identity('not-found'),
    components: [
      { id: 'fixtureMissingTitle', type: 'text', config: { tag: 'h1', text: 'Página no encontrada' } },
    ],
  };

  return {
    localSiteConfig,
    localBlogPageConfig,
    localBlogComponents,
    localBlogVariables: { ...identity('blog'), variables: {} },
    localBlogCombos: { ...identity('blog'), combos: {} },
    localBlogI18n: { ...identity('blog'), lang: 'es', dictionary: {} },
    localNotFoundPageConfig,
    localNotFoundComponents,
    localNotFoundVariables: { ...identity('not-found'), variables: {} },
    localNotFoundCombos: { ...identity('not-found'), combos: {} },
    localNotFoundI18n: { ...identity('not-found'), lang: 'es', dictionary: {} },
  };
}
