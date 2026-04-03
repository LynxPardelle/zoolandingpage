import { InteractionScopeService } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { DomainResolverService } from '@/app/shared/services/domain-resolver.service';
import { PublicImageUploadService } from '@/app/shared/services/public-image-upload.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { uploadPublicImageHandler } from './image-upload.handlers';

describe('uploadPublicImageHandler', () => {
    let uploads: jasmine.SpyObj<PublicImageUploadService>;
    let configStore: ConfigStoreService;
    let scope: InteractionScopeService;
    let context: EventExecutionContext;

    beforeEach(() => {
        uploads = jasmine.createSpyObj<PublicImageUploadService>('PublicImageUploadService', ['uploadImage']);

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                InteractionScopeService,
                { provide: PublicImageUploadService, useValue: uploads },
                { provide: DomainResolverService, useValue: { resolveDomain: () => ({ domain: 'fallback.example', source: 'urlHost' }) } },
            ],
        });

        configStore = TestBed.inject(ConfigStoreService);
        scope = TestBed.inject(InteractionScopeService);
        scope.configure({ scopeId: 'uploadForm' });
        configStore.setSiteConfig({ version: 1, domain: 'zoolandingpage.com.mx', routes: [], site: { appIdentity: {}, theme: {}, i18n: {} } } as any);
        configStore.setPageConfig({ version: 1, domain: 'zoolandingpage.com.mx', pageId: 'default', rootIds: [] } as any);

        context = {
            event: {
                componentId: 'heroImageField',
                eventName: 'valueChanged',
                eventData: {
                    fieldId: 'heroImageFile',
                },
            },
            host: {
                scopeId: 'uploadForm',
                interactionScope: scope,
            },
        };
    });

    it('uploads the selected file and stores the result in interaction scope', async () => {
        const file = new File(['image-bytes'], 'hero.png', { type: 'image/png' });
        uploads.uploadImage.and.resolveTo({
            bucket: 'zoolandingpage-public-files',
            key: 'zoolandingpage.com.mx/default/hero-image.png',
            contentType: 'image/png',
            publicUrl: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/default/hero-image.png',
            uploadStrategy: 'direct',
        });

        const handler = TestBed.runInInjectionContext(() => uploadPublicImageHandler());
        await handler.handle({
            ...context,
            event: {
                ...context.event,
                eventData: {
                    ...context.event.eventData as Record<string, unknown>,
                    value: file,
                },
            },
        }, ['heroImageUpload', file, 'hero-image', 'hero', 1600, 1600]);

        expect(uploads.uploadImage).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            assetId: 'hero-image',
            assetKind: 'hero',
            file,
            maxWidth: 1600,
            maxHeight: 1600,
        }));
        expect(scope.snapshot().values['heroImageUpload']).toEqual(jasmine.objectContaining({
            status: 'success',
            fileName: 'hero.png',
            publicUrl: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/default/hero-image.png',
            uploadStrategy: 'direct',
        }));
    });

    it('stores an error state when the upload fails', async () => {
        const file = new File(['image-bytes'], 'hero.png', { type: 'image/png' });
        uploads.uploadImage.and.rejectWith(new Error('Upload failed on purpose'));

        const handler = TestBed.runInInjectionContext(() => uploadPublicImageHandler());
        await handler.handle({
            ...context,
            event: {
                ...context.event,
                eventData: {
                    ...context.event.eventData as Record<string, unknown>,
                    value: file,
                },
            },
        }, ['heroImageUpload', file]);

        expect(scope.snapshot().values['heroImageUpload']).toEqual(jasmine.objectContaining({
            status: 'error',
            fileName: 'hero.png',
            error: 'Upload failed on purpose',
        }));
    });
});
