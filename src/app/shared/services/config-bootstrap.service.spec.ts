import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { TContentHubRuntimeArticleSummary } from '../types/content-hub.types';
import type { TComponentPayloadEntry, TComponentsPayload, TDraftSiteConfigPayload } from '../types/config-payloads.types';
import { ConfigBootstrapService } from './config-bootstrap.service';
import { ConfigSourceService } from './config-source.service';
import { ConfigStoreService } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { I18nService } from './i18n.service';
import { LanguageService } from './language.service';
import { StructuredDataService } from './structured-data.service';
import { VariableStoreService } from './variable-store.service';

const createSiteConfig = () => ({
    version: 1,
    domain: 'zoolandingpage.com.mx',
    routes: [{ path: '/', pageId: 'default' }],
    site: {
        appIdentity: {
            identifier: 'zoolandingpagecommx',
            name: 'Zoo Landing Page',
        },
        theme: {
            palettes: {
                light: {
                    bgColor: '#ffffff',
                    textColor: '#111111',
                    titleColor: '#222222',
                    linkColor: '#333333',
                    accentColor: '#444444',
                    secondaryBgColor: '#f5f5f5',
                    secondaryTextColor: '#555555',
                    secondaryTitleColor: '#666666',
                    secondaryLinkColor: '#777777',
                    secondaryAccentColor: '#888888',
                    successColor: '#198754',
                    onSuccessColor: '#052e1c',
                    errorColor: '#dc3545',
                    onErrorColor: '#3b0a10',
                    warningColor: '#f59e0b',
                    onWarningColor: '#3a2400',
                    infoColor: '#0d6efd',
                    onInfoColor: '#041b44',
                },
                dark: {
                    bgColor: '#000000',
                    textColor: '#fefefe',
                    titleColor: '#efefef',
                    linkColor: '#dddddd',
                    accentColor: '#cccccc',
                    secondaryBgColor: '#111111',
                    secondaryTextColor: '#bbbbbb',
                    secondaryTitleColor: '#aaaaaa',
                    secondaryLinkColor: '#999999',
                    secondaryAccentColor: '#888888',
                    successColor: '#32d583',
                    onSuccessColor: '#f3fff8',
                    errorColor: '#ff6b6b',
                    onErrorColor: '#fff5f5',
                    warningColor: '#f5b942',
                    onWarningColor: '#fff7e6',
                    infoColor: '#58a6ff',
                    onInfoColor: '#f5fbff',
                },
            },
        },
        i18n: {
            defaultLanguage: 'es',
            supportedLanguages: ['es', 'en'],
        },
    },
});

const createComponentsPayload = (components: Record<string, TComponentPayloadEntry>): TComponentsPayload => ({
    version: 1,
    pageId: 'default',
    domain: 'zoolandingpage.com.mx',
    components: Object.values(components) as TComponentPayloadEntry[],
});

describe('ConfigBootstrapService', () => {
    let service: ConfigBootstrapService;
    let source: jasmine.SpyObj<ConfigSourceService>;
    let i18n: jasmine.SpyObj<I18nService>;
    let language: jasmine.SpyObj<LanguageService>;
    let store: ConfigStoreService;
    let variableStore: VariableStoreService;

    beforeEach(() => {
        source = jasmine.createSpyObj<ConfigSourceService>('ConfigSourceService', [
            'loadPageConfig',
            'loadComponents',
            'loadVariables',
            'loadCombos',
            'loadI18n',
        ]);
        i18n = jasmine.createSpyObj<I18nService>('I18nService', [
            'disableAutoLoad',
            'setLoader',
            'prefetch',
            'setTranslations',
            'enableAutoLoad',
        ]);
        language = jasmine.createSpyObj<LanguageService>('LanguageService', [
            'currentLanguage',
            'configureLanguages',
        ]);
        language.currentLanguage.and.returnValue('es');

        TestBed.configureTestingModule({
            providers: [
                ConfigBootstrapService,
                ConfigStoreService,
                VariableStoreService,
                { provide: PLATFORM_ID, useValue: 'browser' },
                {
                    provide: ConfigSourceService,
                    useValue: source,
                },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoolandingpage.com.mx' }),
                    },
                },
                {
                    provide: I18nService,
                    useValue: i18n,
                },
                {
                    provide: LanguageService,
                    useValue: language,
                },
                {
                    provide: StructuredDataService,
                    useValue: {
                        applyEntries: () => false,
                    },
                },
            ],
        });

        service = TestBed.inject(ConfigBootstrapService);
        store = TestBed.inject(ConfigStoreService);
        variableStore = TestBed.inject(VariableStoreService);
    });

    const mockSuccessfulBootstrapPayloads = () => {
        source.loadPageConfig.and.resolveTo({
            version: 1,
            pageId: 'blog',
            domain: 'zoolandingpage.com.mx',
            rootIds: ['blogRoot'],
            modalRootIds: [],
        });
        source.loadComponents.and.resolveTo(createComponentsPayload({
            blogRoot: {
                id: 'blogRoot',
                type: 'container',
                config: { tag: 'main', components: [] },
            },
        }));
        source.loadVariables.and.resolveTo({
            version: 1,
            pageId: 'blog',
            domain: 'zoolandingpage.com.mx',
            variables: {},
        });
        source.loadCombos.and.resolveTo(null);
        source.loadI18n.and.resolveTo({
            version: 1,
            pageId: 'blog',
            domain: 'zoolandingpage.com.mx',
            lang: 'es',
            dictionary: {},
        });
    };

    const createContentHubSiteConfig = (): TDraftSiteConfigPayload => ({
        ...createSiteConfig(),
        site: {
            ...createSiteConfig().site,
            seo: {
                canonicalOrigin: 'https://zoositioweb.com.mx',
                siteName: 'zoositioweb',
                defaultImage: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/seo-images/zoolandingpage-zoositioweb-default-logo-card.jpg',
            },
        },
        runtime: {
            contentHubs: [
                {
                    hubId: 'zoosite-main',
                    ownerDraftDomain: 'zoositioweb.com.mx',
                    source: 'primary',
                    routeBasePath: '/blog',
                    listPath: '/blog',
                    articlePathPattern: '/blog/:categorySlug/:articleSlug',
                    defaultLocale: 'es',
                    locales: ['es', 'en'],
                    canonicalMode: 'host-adaptive',
                    publicArticles: [
                        {
                            articleId: 'art_web',
                            locale: 'es',
                            status: 'published',
                            title: 'Web Article',
                            summary: 'Article summary for SEO',
                            path: '/blog/web/blog-builder-seo',
                            categorySlug: 'web',
                            tags: ['seo', 'builder'],
                            publishedAt: '2026-06-27T12:00:00.000Z',
                            updatedAt: '2026-06-28T12:00:00.000Z',
                            canonicalPath: '/blog/web/blog-builder-seo',
                            robots: 'index,follow',
                            authorLabel: 'Zoosite editorial',
                        },
                        {
                            articleId: 'art_news',
                            locale: 'es',
                            status: 'published',
                            title: 'News Article',
                            path: '/blog/noticias/release-note',
                            categorySlug: 'noticias',
                            tags: ['release'],
                            publishedAt: '2026-06-27T13:00:00.000Z',
                        },
                        {
                            articleId: 'art_web_en',
                            locale: 'en',
                            status: 'published',
                            title: 'English Web Article',
                            path: '/blog/web/english-builder',
                            categorySlug: 'web',
                            tags: ['seo'],
                            publishedAt: '2026-06-27T13:30:00.000Z',
                        },
                        {
                            articleId: 'art_private',
                            locale: 'es',
                            status: 'published',
                            visibility: 'private',
                            title: 'Private Article',
                            path: '/blog/web/private-note',
                            categorySlug: 'web',
                            tags: ['private'],
                            publishedAt: '2026-06-27T14:00:00.000Z',
                        } as TContentHubRuntimeArticleSummary & { readonly visibility: 'private' },
                    ],
                    publicTaxonomy: [
                        {
                            taxonomyId: 'cat_web',
                            kind: 'category',
                            slug: 'web',
                            label: 'Web',
                            locale: 'es',
                            visible: true,
                            path: '/blog/web',
                        },
                        {
                            taxonomyId: 'cat_web_en',
                            kind: 'category',
                            slug: 'web',
                            label: 'Web EN',
                            locale: 'en',
                            visible: true,
                            path: '/blog/web',
                        },
                        {
                            taxonomyId: 'tag_seo',
                            kind: 'tag',
                            slug: 'seo',
                            label: 'SEO',
                            locale: 'es',
                            visible: true,
                            path: '/blog/tag/seo',
                        },
                        {
                            taxonomyId: 'tag_seo_en',
                            kind: 'tag',
                            slug: 'seo',
                            label: 'SEO EN',
                            locale: 'en',
                            visible: true,
                            path: '/blog/tag/seo',
                        },
                    ],
                },
            ],
        },
    });

    it('does not block bootstrap completion on the fallback language prefetch', async () => {
        let resolveFallback!: (payload: unknown) => void;
        let scheduledFallback!: () => void;
        spyOn<any>(service, 'isAutomatedBrowser').and.returnValue(false);
        const nativeSetTimeout = window.setTimeout.bind(window);
        const setTimeoutSpy = spyOn(window, 'setTimeout').and.callFake(((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
            if (timeout !== 3000) {
                return nativeSetTimeout(handler, timeout, ...args);
            }

            scheduledFallback = typeof handler === 'function'
                ? handler as () => void
                : () => Function(handler)();
            return 1;
        }) as typeof window.setTimeout);

        store.setSiteConfig(createSiteConfig());
        source.loadPageConfig.and.resolveTo({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            rootIds: ['landingPage'],
            modalRootIds: [],
        });
        source.loadComponents.and.resolveTo(createComponentsPayload({
            landingPage: {
                id: 'landingPage',
                type: 'container',
                config: { tag: 'main', components: [] },
            },
        }));
        source.loadVariables.and.resolveTo({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {},
        });
        source.loadCombos.and.resolveTo(null);
        source.loadI18n.and.callFake(async (_domain: string, _pageId: string, langCode: string) => {
            if (langCode === 'es') {
                return {
                    version: 1,
                    pageId: 'default',
                    domain: 'zoolandingpage.com.mx',
                    lang: 'es',
                    dictionary: {},
                };
            }

            return await new Promise((resolve) => {
                resolveFallback = resolve;
            }) as any;
        });

        await expectAsync(service.load({
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            lang: 'es',
        })).toBeResolvedTo(jasmine.objectContaining({
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
        }));

        expect(source.loadI18n.calls.allArgs().map((args) => args.slice(0, 3))).toEqual([
            ['zoolandingpage.com.mx', 'default', 'es'],
        ]);
        expect(setTimeoutSpy).toHaveBeenCalled();
        expect(i18n.setTranslations).toHaveBeenCalledWith('es', {}, {
            cache: true,
            applyIfCurrent: true,
        });

        scheduledFallback();
        expect(source.loadI18n.calls.allArgs().map((args) => args.slice(0, 3))).toEqual([
            ['zoolandingpage.com.mx', 'default', 'es'],
            ['zoolandingpage.com.mx', 'default', 'en'],
        ]);

        resolveFallback({
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            lang: 'en',
            dictionary: {},
        });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(i18n.setTranslations).toHaveBeenCalledWith('en', {}, {
            cache: true,
            applyIfCurrent: false,
        });
    });

    it('hydrates content hub runtime variables and filters category routes', async () => {
        store.setSiteConfig(createContentHubSiteConfig());
        mockSuccessfulBootstrapPayloads();

        await service.load({
            domain: 'zoolandingpage.com.mx',
            pageId: 'blog-category',
            lang: 'es',
            routePath: '/blog/web',
            routeParams: {
                categorySlug: 'web',
            },
        });

        expect(variableStore.get('contentHub.publicArticles.items')).toEqual([
            jasmine.objectContaining({
                articleId: 'art_web',
                title: 'Web Article',
            }),
        ]);
        expect(variableStore.get('contentHub.publicArticles.items')).not.toContain(jasmine.objectContaining({
            articleId: 'art_private',
        }));
        expect(variableStore.get('contentHub.categories.items')).toEqual([
            jasmine.objectContaining({
                taxonomyId: 'cat_web',
                slug: 'web',
            }),
        ]);
        expect(variableStore.get('contentHub.tags.items')).toEqual([
            jasmine.objectContaining({
                taxonomyId: 'tag_seo',
                slug: 'seo',
            }),
        ]);
    });

    it('sets the current content hub article from article routes', async () => {
        store.setSiteConfig(createContentHubSiteConfig());
        mockSuccessfulBootstrapPayloads();

        await service.load({
            domain: 'zoolandingpage.com.mx',
            pageId: 'blog-article',
            lang: 'es',
            routePath: '/blog/web/blog-builder-seo',
            routeParams: {
                categorySlug: 'web',
                articleSlug: 'blog-builder-seo',
            },
        });

        expect(variableStore.get('contentHub.currentArticle')).toEqual(jasmine.objectContaining({
            articleId: 'art_web',
            title: 'Web Article',
            categorySlug: 'web',
        }));
    });

    it('uses the current content hub article for client-side seo and structured data', async () => {
        store.setSiteConfig(createContentHubSiteConfig());
        mockSuccessfulBootstrapPayloads();
        source.loadPageConfig.and.resolveTo({
            version: 1,
            pageId: 'blog-article',
            domain: 'zoolandingpage.com.mx',
            rootIds: ['blogRoot'],
            modalRootIds: [],
            seo: {
                title: 'Generic blog article',
                description: 'Generic article description',
                canonical: '/blog',
            },
            structuredData: {
                entries: [{ '@context': 'https://schema.org', '@type': 'WebPage' }],
            },
        });

        await service.load({
            domain: 'zoolandingpage.com.mx',
            pageId: 'blog-article',
            lang: 'es',
            routePath: '/blog/web/blog-builder-seo',
            routeParams: {
                categorySlug: 'web',
                articleSlug: 'blog-builder-seo',
            },
        });

        expect(store.seo()).toEqual(jasmine.objectContaining({
            title: 'Web Article',
            description: 'Article summary for SEO',
            canonical: 'https://zoositioweb.com.mx/blog/web/blog-builder-seo',
            robots: 'index,follow',
            keywords: ['seo', 'builder'],
            openGraph: jasmine.objectContaining({
                type: 'article',
                title: 'Web Article',
                description: 'Article summary for SEO',
                url: 'https://zoositioweb.com.mx/blog/web/blog-builder-seo',
                image: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/seo-images/zoolandingpage-zoositioweb-default-logo-card.jpg',
            }),
        }));
        expect(store.structuredData()?.entries).toContain(jasmine.objectContaining({
            '@type': 'BlogPosting',
            headline: 'Web Article',
            description: 'Article summary for SEO',
            url: 'https://zoositioweb.com.mx/blog/web/blog-builder-seo',
            mainEntityOfPage: 'https://zoositioweb.com.mx/blog/web/blog-builder-seo',
            datePublished: '2026-06-27T12:00:00.000Z',
            dateModified: '2026-06-28T12:00:00.000Z',
            articleSection: 'web',
            keywords: 'seo, builder',
            image: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/seo-images/zoolandingpage-zoositioweb-default-logo-card.jpg',
            publisher: jasmine.objectContaining({
                '@type': 'Organization',
                name: 'zoositioweb',
            }),
        }));
    });

    it('does not set private content hub articles as current article', async () => {
        store.setSiteConfig(createContentHubSiteConfig());
        mockSuccessfulBootstrapPayloads();

        await service.load({
            domain: 'zoolandingpage.com.mx',
            pageId: 'blog-article',
            lang: 'es',
            routePath: '/blog/web/private-note',
            routeParams: {
                categorySlug: 'web',
                articleSlug: 'private-note',
            },
        });

        expect(variableStore.get('contentHub.currentArticle')).toBeNull();
    });

    it('reports missing modal config when a payload references a modal-owned dialog', () => {
        const issues = (service as any).buildValidationIssues({
            siteConfig: createSiteConfig(),
            pageConfig: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                rootIds: ['landingPage'],
                modalRootIds: ['modalTermsRoot'],
            },
            components: createComponentsPayload({
                landingPage: {
                    id: 'landingPage',
                    type: 'button',
                    eventInstructions: 'openModal:terms-of-service,footer:terms,open_terms_modal,footer',
                    config: { label: 'Open terms' },
                },
                modalTermsRoot: {
                    id: 'modalTermsRoot',
                    type: 'container',
                    condition: 'all:modalRefId,terms-of-service',
                    config: { tag: 'section', components: [] },
                },
            }),
            variables: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                variables: {
                    ui: {},
                },
            },
            combos: null,
            i18n: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                lang: 'es',
                dictionary: {},
            },
            seo: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                title: 'SEO title',
                description: 'SEO description',
                canonical: 'https://zoolandingpage.com.mx/',
            },
            structuredData: null,
            analytics: null,
        });

        expect(issues).toContain('config.ui.modals.terms-of-service is required when modal "terms-of-service" is referenced.');
    });

    it('reports missing modal aria labels when a referenced modal config is incomplete', () => {
        const issues = (service as any).buildValidationIssues({
            siteConfig: createSiteConfig(),
            pageConfig: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                rootIds: ['landingPage'],
                modalRootIds: ['modalTermsRoot'],
            },
            components: createComponentsPayload({
                landingPage: {
                    id: 'landingPage',
                    type: 'button',
                    eventInstructions: 'openModal:terms-of-service',
                    config: { label: 'Open terms' },
                },
                modalTermsRoot: {
                    id: 'modalTermsRoot',
                    type: 'container',
                    condition: 'all:modalRefId,terms-of-service',
                    config: { tag: 'section', components: [] },
                },
            }),
            variables: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                variables: {
                    ui: {
                        modals: {
                            'terms-of-service': {
                                size: 'lg',
                            },
                        },
                    },
                },
            },
            combos: null,
            i18n: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                lang: 'es',
                dictionary: {},
            },
            seo: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                title: 'SEO title',
                description: 'SEO description',
                canonical: 'https://zoolandingpage.com.mx/',
            },
            structuredData: null,
            analytics: null,
        });

        expect(issues).toContain('config.ui.modals.terms-of-service.ariaLabel or ariaLabelKey is required when modal "terms-of-service" is referenced.');
    });

    it('allows loop-generated child references that use the {{index}} placeholder', () => {
        const issues = (service as any).buildValidationIssues({
            siteConfig: createSiteConfig(),
            pageConfig: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                rootIds: ['badgesListContainer'],
            },
            components: createComponentsPayload({
                badgesListContainer: {
                    id: 'badgesListContainer',
                    type: 'container',
                    loopConfig: {
                        source: 'i18n',
                        path: 'hero.badges',
                        templateId: 'badgeContainerTemplate',
                        idPrefix: 'badgeContainer',
                    },
                    config: { tag: 'div', components: [] },
                },
                badgeContainerTemplate: {
                    id: 'badgeContainerTemplate',
                    type: 'container',
                    config: { tag: 'div', components: ['badgeText__{{index}}'] },
                },
                badgeTextTemplate: {
                    id: 'badgeTextTemplate',
                    type: 'text',
                    loopConfig: {
                        source: 'i18n',
                        path: 'hero.badges',
                        templateId: 'badgeTextTemplate',
                        idPrefix: 'badgeText',
                    },
                    config: { tag: 'span', text: '' },
                },
            }),
            variables: null,
            combos: null,
            i18n: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                lang: 'es',
                dictionary: {},
            },
            seo: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                title: 'SEO title',
                description: 'SEO description',
                canonical: 'https://zoolandingpage.com.mx/',
            },
            structuredData: null,
            analytics: null,
        });

        expect(issues.some((issue: string) => issue.includes('badgeText__{{index}}'))).toBeFalse();
    });

    it('accepts localized seo values during bootstrap validation', () => {
        const issues = (service as any).buildValidationIssues({
            siteConfig: createSiteConfig(),
            pageConfig: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                rootIds: ['landingPage'],
            },
            components: createComponentsPayload({
                landingPage: {
                    id: 'landingPage',
                    type: 'container',
                    config: { tag: 'main', components: [] },
                },
            }),
            variables: null,
            combos: null,
            i18n: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                lang: 'es',
                dictionary: {},
            },
            seo: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                title: {
                    es: 'Titulo SEO',
                    en: 'SEO title',
                },
                description: {
                    es: 'Descripcion SEO',
                    en: 'SEO description',
                },
                canonical: {
                    es: 'https://zoolandingpage.com.mx/',
                    en: 'https://zoolandingpage.com.mx/en',
                },
            },
            structuredData: null,
            analytics: null,
        });

        expect(issues).not.toContain('seo.title is required.');
        expect(issues).not.toContain('seo.description is required.');
        expect(issues).not.toContain('seo.canonical is required.');
    });
});
