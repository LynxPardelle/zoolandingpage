import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { DomainResolverService } from './domain-resolver.service';
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
            ],
        });

        service = TestBed.inject(SeoMetadataService);
    });

    it('uses the resolved domain as the fallback site identity instead of a hardcoded shell title', () => {
        service.apply('es', null);

        expect(title.setTitle).toHaveBeenCalledWith('zoolandingpage.com.mx');
        expect(meta.updateTag).toHaveBeenCalledWith({ name: 'description', content: '' });
        expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:site_name', content: 'zoolandingpage.com.mx' });
    });
});
