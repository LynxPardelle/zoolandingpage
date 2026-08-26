import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { DomainResolverService } from './domain-resolver.service';
import { RuntimeConfigService } from './runtime-config.service';
import { ConfigStoreService } from './config-store.service';
import { SeoMetadataService } from './seo-metadata.service';
import { VariableStoreService } from './variable-store.service';

describe('SeoMetadataService', () => {
    let service: SeoMetadataService;
    let title: jasmine.SpyObj<Title>;
    let meta: jasmine.SpyObj<Meta>;
    let variables: VariableStoreService;

    beforeEach(() => {
        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: document },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoolandingpage.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => null,
                        appName: () => 'Zoo Landing Page',
                        appDescription: () => 'Draft-driven landing pages.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        variables = TestBed.inject(VariableStoreService);
    });

    it('uses page identity as the fallback site metadata instead of shell defaults', () => {
        service.apply('es', null);

        expect(title.setTitle).toHaveBeenCalledWith('Zoo Landing Page');
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Draft-driven landing pages.' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:site_name', content: 'Zoo Landing Page' });
    });

    it('uses site-config seo defaults for shared metadata fallbacks', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: document },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'example.com' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Example Site',
                            title: 'Example Site',
                            description: 'Shared site description.',
                            canonicalOrigin: 'https://example.com',
                            defaultImage: 'https://example.com/og-default.png',
                            openGraph: { type: 'website', site_name: 'Example Site' },
                            twitter: { card: 'summary' },
                        }),
                        appName: () => 'Ignored App Name',
                        appDescription: () => 'Ignored app description.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('en', null);

        expect(title.setTitle).toHaveBeenCalledWith('Example Site');
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Shared site description.' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image', content: 'https://example.com/og-default.png' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:type', content: 'image/png' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:alt', content: 'Example Site' });
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:card', content: 'summary' });
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:image:alt', content: 'Example Site' });
    });

    it('emits absolute share image metadata with dimensions and alt text', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://zoositioweb.com.mx',
                    pathname: '/',
                    search: '',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoositioweb.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Zoo Sitio Web',
                            title: 'Zoo Sitio Web',
                            canonicalOrigin: 'https://zoositioweb.com.mx',
                            defaultImage: '/shared/default-card.jpg',
                            openGraph: {
                                'image:width': '1200',
                                'image:height': '630',
                                'image:alt': 'Zoo Sitio Web wordmark',
                            },
                        }),
                        appName: () => 'Zoo Sitio Web',
                        appDescription: () => 'Sitios web medibles.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', {
            title: 'Sitios web profesionales',
            openGraph: {
                image: '/share-card.jpg',
            },
        } as never);

        expect(meta.updateTag).toHaveBeenCalledWith({
            property: 'og:image',
            content: 'https://zoositioweb.com.mx/share-card.jpg',
        });
        expect(meta.updateTag).toHaveBeenCalledWith({
            property: 'og:image:secure_url',
            content: 'https://zoositioweb.com.mx/share-card.jpg',
        });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:type', content: 'image/jpeg' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:width', content: '1200' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:height', content: '630' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:alt', content: 'Zoo Sitio Web wordmark' });
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:image:alt', content: 'Zoo Sitio Web wordmark' });
    });

    it('syncs draft-configured browser icons into the document head', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://zoositioweb.com.mx',
                    pathname: '/',
                    search: '',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoositioweb.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'zoositioweb',
                            canonicalOrigin: 'https://zoositioweb.com.mx',
                        }),
                        browserIcons: () => ({
                            favicon: 'https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/favicon.svg',
                            appleTouchIcon: 'https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/apple-touch-icon.png',
                            maskIcon: 'https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/mask-icon.svg',
                            themeColor: '#128c7e',
                        }),
                        appName: () => 'zoositioweb',
                        appDescription: () => 'Sitios web medibles.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', null);

        expect(seoDoc.head.querySelector('link[rel="icon"]')?.getAttribute('href'))
            .toBe('https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/favicon.svg');
        expect(seoDoc.head.querySelector('link[rel="icon"]')?.getAttribute('type')).toBe('image/svg+xml');
        expect(seoDoc.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'))
            .toBe('https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/apple-touch-icon.png');
        expect(seoDoc.head.querySelector('link[rel="mask-icon"]')?.getAttribute('href'))
            .toBe('https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/mask-icon.svg');
        expect(seoDoc.head.querySelector('link[rel="mask-icon"]')?.getAttribute('color')).toBe('#128c7e');
        expect(seoDoc.head.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#128c7e');
    });

    it('falls back to the default Zoolandingpage browser icon when the draft omits icon config', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://example.com',
                    pathname: '/',
                    search: '',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'example.com' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Example',
                            canonicalOrigin: 'https://example.com',
                        }),
                        browserIcons: () => null,
                        appName: () => 'Example',
                        appDescription: () => 'Example draft.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', null);

        expect(seoDoc.head.querySelector('link[rel="icon"]')?.getAttribute('href'))
            .toBe('/assets/brand/zoolandingpage-default-favicon.svg');
    });

    it('uses the default logo social card when a draft omits share images', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://example.com',
                    pathname: '/',
                    search: '',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'example.com' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Example',
                            canonicalOrigin: 'https://example.com',
                        }),
                        browserIcons: () => ({
                            favicon: 'https://assets.zoolandingpage.com.mx/example.com/shared/brand/favicon.svg',
                        }),
                        appName: () => 'Example',
                        appDescription: () => 'Example draft.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', null);

        const defaultSocialCard = 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/seo-images/zoolandingpage-zoositioweb-default-logo-card.jpg';
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image', content: defaultSocialCard });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:secure_url', content: defaultSocialCard });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:type', content: 'image/jpeg' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:width', content: '1200' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:image:height', content: '630' });
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:image', content: defaultSocialCard });
    });

    it('resolves localized seo values using the active language', () => {
        service.apply('en', {
            title: { es: 'Titulo ES', en: 'Title EN' },
            description: { es: 'Descripcion ES', en: 'Description EN' },
            openGraph: {
                title: { es: 'OG ES', en: 'OG EN' },
                description: { es: 'OG Desc ES', en: 'OG Desc EN' },
            },
            twitter: {
                title: { es: 'TW ES', en: 'TW EN' },
            },
        });

        expect(title.setTitle).toHaveBeenCalledWith('Title EN');
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Description EN' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:title', content: 'OG EN' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:description', content: 'OG Desc EN' });
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:title', content: 'TW EN' });
    });

    it('emits localized keywords and robots tags from page seo payload', () => {
        service.apply('en', {
            title: 'Title EN',
            description: 'Description EN',
            canonical: 'https://zoolandingpage.com.mx/',
            keywords: {
                es: ['landing page', 'seo tecnico'],
                en: ['landing page', 'technical seo', 'ai search'],
            },
            robots: {
                es: 'index,follow',
                en: 'index,follow,max-image-preview:large',
            },
        } as never);

        expect(meta.updateTag).toHaveBeenCalledWith({
            name: 'keywords',
            content: 'landing page, technical seo, ai search',
        });
        expect(meta.updateTag).toHaveBeenCalledWith({
            name: 'robots',
            content: 'index,follow,max-image-preview:large',
        });
    });

    it('keeps content hub tag filter routes noindex with their own clean canonical after hydration', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://zoositioweb.com.mx',
                    pathname: '/blog/tag/seo',
                    search: '?draftDomain=zoositioweb.com.mx&lang=es',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoositioweb.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'zoositioweb',
                            canonicalOrigin: 'https://zoositioweb.com.mx',
                            enforceCanonicalHost: true,
                            robots: 'index,follow,max-image-preview:large',
                        }),
                        appName: () => 'zoositioweb',
                        appDescription: () => 'Sitios web medibles.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', {
            title: 'Categoría web',
            description: 'Filtro de blog.',
            canonical: 'https://zoositioweb.com.mx/blog/web',
            robots: 'index,follow',
        } as never);

        expect(meta.updateTag).toHaveBeenCalledWith({
            name: 'robots',
            content: 'noindex,nofollow',
        });
        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/blog/tag/seo');
    });

    it('falls back to site-config keywords and robots when the page omits them', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag']);

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: document },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'example.com' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Example Site',
                            title: 'Example Site',
                            description: 'Shared site description.',
                            canonicalOrigin: 'https://example.com',
                            keywords: ['seo', 'chatgpt search', 'bing copilot'],
                            robots: 'index,follow,max-snippet:-1,max-image-preview:large',
                        }),
                        appName: () => 'Ignored App Name',
                        appDescription: () => 'Ignored app description.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('en', {
            title: 'Example Page',
            description: 'Example page description.',
            canonical: 'https://example.com/',
        } as never);

        expect(meta.updateTag).toHaveBeenCalledWith({
            name: 'keywords',
            content: 'seo, chatgpt search, bing copilot',
        });
        expect(meta.updateTag).toHaveBeenCalledWith({
            name: 'robots',
            content: 'index,follow,max-snippet:-1,max-image-preview:large',
        });
    });

    it('uses the canonical page url as the fallback og:url when no page openGraph url is provided', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'http://pamelabetancourt.zoolandingpage.com.mx',
                    pathname: '/',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'pamelabetancourt.zoolandingpage.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            canonicalOrigin: 'https://pamelabetancourt.zoolandingpage.com.mx',
                        }),
                        appName: () => 'Pamela Betancourt',
                        appDescription: () => 'Pamela site',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', {
            title: 'Pamela Betancourt | Home',
            description: 'More strategy, less improvisation.',
            canonical: 'https://pamelabetancourt.zoolandingpage.com.mx/home',
        } as never);

        expect(meta.updateTag).toHaveBeenCalledWith({
            property: 'og:url',
            content: 'https://pamelabetancourt.zoolandingpage.com.mx/home',
        });
    });

    it('resolves draft metadata templates from runtime variables and query params', () => {
        variables.setRuntimeValue('remote.pokemon.selected', {
            items: [{
                name: 'charizard',
                image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
                primaryTypeLabel: 'Fire',
            }],
        });

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://pokeapi-demo.zoolandingpage.com.mx',
                    pathname: '/pokemon',
                    search: '?name=charizard',
                },
            },
        } as unknown as Document;

        TestBed.resetTestingModule();
        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                VariableStoreService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'pokeapi-demo.zoolandingpage.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'PokeAPI Runtime Demo',
                            canonicalOrigin: 'https://pokeapi-demo.zoolandingpage.com.mx',
                            defaultImage: 'https://pokeapi-demo.zoolandingpage.com.mx/default.png',
                        }),
                        appName: () => 'PokeAPI Runtime Demo',
                        appDescription: () => 'Runtime demo',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        variables = TestBed.inject(VariableStoreService);
        variables.setRuntimeValue('remote.pokemon.selected', {
            items: [{
                name: 'charizard',
                image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
                primaryTypeLabel: 'Fire',
            }],
        });

        service.apply('es', {
            title: '{{var:remote.pokemon.selected.items.0.name|titleCase}} | Zoolandingpage',
            description: 'Ficha de {{var:remote.pokemon.selected.items.0.name|titleCase}} tipo {{var:remote.pokemon.selected.items.0.primaryTypeLabel}}.',
            canonical: 'https://pokeapi-demo.zoolandingpage.com.mx/pokemon?name={{query:name|uriComponent}}',
            openGraph: {
                image: '{{var:remote.pokemon.selected.items.0.image}}',
            },
        } as never);

        expect(title.setTitle).toHaveBeenCalledWith('Charizard | Zoolandingpage');
        expect(meta.updateTag).toHaveBeenCalledWith({
            name: 'description',
            content: 'Ficha de Charizard tipo Fire.',
        });
        expect(meta.updateTag).toHaveBeenCalledWith({
            property: 'og:image',
            content: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
        });
        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://pokeapi-demo.zoolandingpage.com.mx/pokemon?name=charizard');
    });

    it('reconciles SSR hreflang links idempotently for an ordinary three-language route', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        for (const [language, href] of [
            ['es', 'https://zoositioweb.com.mx/contacto?ref=keep&lang=es'],
            ['en', 'https://zoositioweb.com.mx/contacto?ref=keep&lang=en'],
            ['zh', 'https://zoositioweb.com.mx/contacto?ref=keep&lang=zh'],
            ['x-default', 'https://zoositioweb.com.mx/contacto?ref=keep&lang=es'],
        ] as const) {
            const link = baseDoc.createElement('link');
            link.setAttribute('rel', 'alternate');
            link.setAttribute('hreflang', language);
            link.setAttribute('href', href);
            baseDoc.head.appendChild(link);
        }
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://zoositioweb.com.mx',
                    pathname: '/contacto',
                    search: '?gclid=test&utm_source=google&utm_campaign=spring&ref=keep',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                VariableStoreService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'zoositioweb.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Zoosite',
                            canonicalOrigin: 'https://zoositioweb.com.mx',
                        }),
                        appName: () => 'Zoosite',
                        appDescription: () => 'Sitios web medibles.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        variables = TestBed.inject(VariableStoreService);
        variables.setPayload(null, {
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                appIdentity: { identifier: 'zoosite', name: 'Zoosite' },
                theme: { palettes: {} },
                i18n: {
                    defaultLanguage: 'es',
                    supportedLanguages: ['es', 'en', 'zh'],
                },
            },
        } as never);

        service.apply('es', {
            title: 'Contacto',
            description: 'Contacto por WhatsApp.',
            canonical: 'https://zoositioweb.com.mx/contacto?gclid=test&utm_source=google&ref=keep',
        } as never);
        service.apply('es', {
            title: 'Contacto',
            description: 'Contacto por WhatsApp.',
            canonical: 'https://zoositioweb.com.mx/contacto?gclid=test&utm_source=google&ref=keep',
        } as never);

        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep');
        expect(seoDoc.head.querySelectorAll('link[rel="alternate"][hreflang]').length).toBe(4);
        for (const language of ['es', 'en', 'zh', 'x-default']) {
            expect(seoDoc.head.querySelectorAll(`link[rel="alternate"][hreflang="${language}"]`).length)
                .withContext(language)
                .toBe(1);
        }
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="es"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=es');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=en');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="zh"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=zh');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=es');
    });

    it('emits exact fixed-language sibling paths for a trailing-slash pathname despite a conflicting query language', () => {
        TestBed.resetTestingModule();
        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
        const baseDoc = document.implementation.createHTMLDocument('fixed-route-seo');
        for (const [language, href] of [
            ['en', 'https://grupoastralegal.com/soft-landing-china/eng'],
            ['zh', 'https://grupoastralegal.com/soft-landing-china/zh'],
            ['x-default', 'https://grupoastralegal.com/soft-landing-china/eng'],
        ] as const) {
            const link = baseDoc.createElement('link');
            link.setAttribute('rel', 'alternate');
            link.setAttribute('hreflang', language);
            link.setAttribute('href', href);
            baseDoc.head.appendChild(link);
        }
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://grupoastralegal.com',
                    pathname: '/soft-landing-china/zh/',
                    search: '?lang=en',
                },
            },
        } as unknown as Document;
        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                VariableStoreService,
                ConfigStoreService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                { provide: DomainResolverService, useValue: { resolveDomain: () => ({ domain: 'grupoastralegal.com' }) } },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({ canonicalOrigin: 'https://grupoastralegal.com', siteName: 'Astra Legal' }),
                        appName: () => 'Astra Legal',
                        appDescription: () => '',
                    },
                },
            ],
        });
        const siteConfig = {
            version: 1,
            domain: 'grupoastralegal.com',
            routes: [
                { path: '/soft-landing-china/eng', pageId: 'soft-landing-china', language: 'en' },
                { path: '/soft-landing-china/zh', pageId: 'soft-landing-china', language: 'zh' },
            ],
            site: {
                appIdentity: { identifier: 'astra', name: 'Astra Legal' },
                theme: { palettes: {} },
                i18n: { defaultLanguage: 'es', supportedLanguages: ['es', 'en', 'zh'] },
            },
        } as never;
        TestBed.inject(ConfigStoreService).setSiteConfig(siteConfig);
        TestBed.inject(VariableStoreService).setPayload(null, siteConfig);
        service = TestBed.inject(SeoMetadataService);

        service.apply('zh', {
            canonical: {
                es: 'https://grupoastralegal.com/soft-landing-china/eng',
                en: 'https://grupoastralegal.com/soft-landing-china/eng',
                zh: 'https://grupoastralegal.com/soft-landing-china/zh',
            },
        });
        service.apply('zh', {
            canonical: {
                es: 'https://grupoastralegal.com/soft-landing-china/eng',
                en: 'https://grupoastralegal.com/soft-landing-china/eng',
                zh: 'https://grupoastralegal.com/soft-landing-china/zh',
            },
        });

        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://grupoastralegal.com/soft-landing-china/zh');
        expect(seoDoc.head.querySelectorAll('link[rel="alternate"][hreflang]').length).toBe(3);
        for (const language of ['en', 'zh', 'x-default']) {
            expect(seoDoc.head.querySelectorAll(`link[rel="alternate"][hreflang="${language}"]`).length)
                .withContext(language)
                .toBe(1);
        }
        expect(meta.updateTag).toHaveBeenCalledWith({
            property: 'og:url',
            content: 'https://grupoastralegal.com/soft-landing-china/zh',
        });
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href'))
            .toBe('https://grupoastralegal.com/soft-landing-china/eng');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="zh"]')?.getAttribute('href'))
            .toBe('https://grupoastralegal.com/soft-landing-china/zh');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href'))
            .toBe('https://grupoastralegal.com/soft-landing-china/eng');
    });

    it('replaces unknown-path SSR alternates with one coherent canonical 404 set', () => {
        TestBed.resetTestingModule();
        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);
        const baseDoc = document.implementation.createHTMLDocument('unknown-route-seo');
        for (const language of ['es', 'en', 'zh', 'x-default']) {
            const link = baseDoc.createElement('link');
            link.setAttribute('rel', 'alternate');
            link.setAttribute('hreflang', language);
            link.setAttribute('href', `https://grupoastralegal.com/ruta-que-no-existe?lang=${language === 'x-default' ? 'es' : language}`);
            baseDoc.head.appendChild(link);
        }
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://grupoastralegal.com',
                    pathname: '/ruta-que-no-existe',
                    search: '?lang=zh',
                },
            },
        } as unknown as Document;
        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                VariableStoreService,
                ConfigStoreService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                { provide: DomainResolverService, useValue: { resolveDomain: () => ({ domain: 'grupoastralegal.com' }) } },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({ canonicalOrigin: 'https://grupoastralegal.com', siteName: 'Astra Legal' }),
                        appName: () => 'Astra Legal',
                        appDescription: () => '',
                    },
                },
            ],
        });
        const siteConfig = {
            version: 1,
            domain: 'grupoastralegal.com',
            routes: [{ path: '/404', pageId: 'not-found' }],
            site: {
                appIdentity: { identifier: 'astra', name: 'Astra Legal' },
                theme: { palettes: {} },
                i18n: { defaultLanguage: 'es', supportedLanguages: ['es', 'en', 'zh'] },
            },
        } as never;
        TestBed.inject(ConfigStoreService).setSiteConfig(siteConfig);
        TestBed.inject(VariableStoreService).setPayload(null, siteConfig);
        service = TestBed.inject(SeoMetadataService);

        service.apply('es', { canonical: 'https://grupoastralegal.com/404' });
        service.apply('es', { canonical: 'https://grupoastralegal.com/404' });

        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://grupoastralegal.com/404');
        const alternates = Array.from(seoDoc.head.querySelectorAll('link[rel="alternate"][hreflang]'));
        expect(alternates.length).toBe(4);
        expect(alternates.map((link) => link.getAttribute('hreflang'))).toEqual(['es', 'en', 'zh', 'x-default']);
        expect(alternates.map((link) => link.getAttribute('href'))).toEqual([
            'https://grupoastralegal.com/404?lang=es',
            'https://grupoastralegal.com/404?lang=en',
            'https://grupoastralegal.com/404?lang=zh',
            'https://grupoastralegal.com/404?lang=es',
        ]);
    });

    it('rebases absolute page canonicals to the active canonical host when enforced', () => {
        TestBed.resetTestingModule();

        title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
        meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag', 'removeTag']);

        const baseDoc = document.implementation.createHTMLDocument('seo');
        const seoDoc = {
            documentElement: baseDoc.documentElement,
            head: baseDoc.head,
            createElement: baseDoc.createElement.bind(baseDoc),
            defaultView: {
                location: {
                    origin: 'https://sitiosweb.zoolandingpage.com.mx',
                    pathname: '/contacto',
                    search: '?gclid=test',
                },
            },
        } as unknown as Document;

        TestBed.configureTestingModule({
            providers: [
                SeoMetadataService,
                VariableStoreService,
                { provide: DOCUMENT, useValue: seoDoc },
                { provide: Title, useValue: title },
                { provide: Meta, useValue: meta },
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'sitiosweb.zoolandingpage.com.mx' }),
                    },
                },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        seoDefaults: () => ({
                            siteName: 'Zoosite alias',
                            canonicalOrigin: 'https://sitiosweb.zoolandingpage.com.mx',
                            enforceCanonicalHost: true,
                        }),
                        appName: () => 'Zoosite alias',
                        appDescription: () => 'Sitios web medibles.',
                    },
                },
            ],
        });

        service = TestBed.inject(SeoMetadataService);
        service.apply('es', {
            title: 'Contacto',
            description: 'Contacto por WhatsApp.',
            canonical: 'https://zoositioweb.com.mx/contacto?utm_source=google&ref=keep',
        } as never);

        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://sitiosweb.zoolandingpage.com.mx/contacto?ref=keep');
    });
});
