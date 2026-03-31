import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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

describe('ConfigBootstrapService', () => {
    let service: ConfigBootstrapService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ConfigBootstrapService,
                ConfigStoreService,
                VariableStoreService,
                { provide: PLATFORM_ID, useValue: 'browser' },
                {
                    provide: ConfigSourceService,
                    useValue: {},
                },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoolandingpage.com.mx' }),
                    },
                },
                {
                    provide: I18nService,
                    useValue: {
                        disableAutoLoad: () => { },
                        setLoader: () => { },
                        prefetch: async () => { },
                        setTranslations: () => { },
                        enableAutoLoad: () => { },
                    },
                },
                {
                    provide: LanguageService,
                    useValue: {
                        currentLanguage: () => 'es',
                        configureLanguages: () => { },
                    },
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
            components: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                components: {
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
                },
            },
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
            components: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                components: {
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
                },
            },
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
            components: {
                version: 1,
                pageId: 'default',
                domain: 'zoolandingpage.com.mx',
                components: {
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
                },
            },
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
});
