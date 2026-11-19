/** Synthetic public Journal config; no local draft checkout or published data is required. */
export function createThnJournalSiteConfig() {
  const palette = {
    bgColor: '#ffffff',
    textColor: '#111111',
    titleColor: '#111111',
    linkColor: '#0000aa',
    accentColor: '#0000aa',
    secondaryBgColor: '#eeeeee',
    secondaryTextColor: '#111111',
    secondaryTitleColor: '#111111',
    secondaryLinkColor: '#0000aa',
    secondaryAccentColor: '#0000aa',
    successColor: '#008800',
    onSuccessColor: '#ffffff',
    errorColor: '#aa0000',
    onErrorColor: '#ffffff',
    warningColor: '#aa6600',
    onWarningColor: '#ffffff',
    infoColor: '#0000aa',
    onInfoColor: '#ffffff',
  };

  return {
    version: 1,
    domain: 'thehairnarrative.com',
    defaultPageId: 'home',
    notFoundPageId: 'not-found',
    routes: [
      { path: '/', pageId: 'home' },
      { path: '/404', pageId: 'not-found' },
      { path: '/the-journal', pageId: 'the-journal' },
      { path: '/the-journal/tag/:tagSlug', pageId: 'the-journal-tag' },
      { path: '/the-journal/:seriesSlug', pageId: 'the-journal-series' },
      { path: '/the-journal/:seriesSlug/:articleSlug', pageId: 'the-journal-article' },
      { path: '/admin/journal', pageId: 'admin-journal', auth: { required: true } },
    ],
    sitemap: {
      excludePaths: [
        '/the-journal/tag/:tagSlug',
        '/the-journal/:seriesSlug',
        '/the-journal/:seriesSlug/:articleSlug',
        '/admin/journal',
      ],
    },
    site: {
      appIdentity: { identifier: 'thn-journal-ssr-fixture', name: 'The Journal fixture' },
      theme: { defaultMode: 'light', palettes: { light: { ...palette }, dark: { ...palette } } },
      i18n: { defaultLanguage: 'en', supportedLanguages: ['en', 'es'] },
      seo: {
        title: 'The Journal fixture',
        description: 'Synthetic public Journal SSR fixture.',
        canonicalOrigin: 'https://thehairnarrative.com',
      },
    },
    runtime: {
      contentHubs: [{
        hubId: 'thn-journal-ssr-fixture',
        ownerDraftDomain: 'thehairnarrative.com',
        source: 'primary',
        routeBasePath: '/the-journal',
        listPath: '/the-journal',
        articlePathPattern: '/the-journal/:seriesSlug/:articleSlug',
        defaultLocale: 'en',
        locales: ['en', 'es'],
        localePolicy: 'published-only',
        canonicalMode: 'owner-canonical',
        publicArticles: [],
      }],
    },
  };
}
