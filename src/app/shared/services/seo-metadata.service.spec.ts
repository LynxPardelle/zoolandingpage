import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { DomainResolverService } from './domain-resolver.service';
import { RuntimeConfigService } from './runtime-config.service';
import { SeoMetadataService } from './seo-metadata.service';

describe('SeoMetadataService', () => {
    let service: SeoMetadataService;
    let title: jasmine.SpyObj<Title>;
    let meta: jasmine.SpyObj<Meta>;

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
});
