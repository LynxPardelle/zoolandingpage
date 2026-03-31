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
});
