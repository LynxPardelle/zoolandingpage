import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { DomainResolverService } from './domain-resolver.service';
import { RuntimeConfigService } from './runtime-config.service';
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
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:card', content: 'summary' });
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

    it('strips ad query parameters from canonicals and emits hreflang links for supported languages', () => {
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
                    supportedLanguages: ['es', 'en'],
                },
            },
        } as never);

        service.apply('es', {
            title: 'Contacto',
            description: 'Contacto por WhatsApp.',
            canonical: 'https://zoositioweb.com.mx/contacto?gclid=test&utm_source=google&ref=keep',
        } as never);

        expect(seoDoc.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="es"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=es');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=en');
        expect(seoDoc.head.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute('href'))
            .toBe('https://zoositioweb.com.mx/contacto?ref=keep&lang=es');
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
