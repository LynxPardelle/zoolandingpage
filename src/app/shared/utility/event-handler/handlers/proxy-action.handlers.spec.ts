import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { RuntimeApiProxyClientService } from '@/app/shared/services/runtime-api-proxy-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { proxyActionHandler } from './proxy-action.handlers';

describe('proxyActionHandler', () => {
    let proxy: jasmine.SpyObj<RuntimeApiProxyClientService>;
    let configStore: ConfigStoreService;
    let variables: VariableStoreService;
    let context: EventExecutionContext;

    beforeEach(() => {
        proxy = jasmine.createSpyObj<RuntimeApiProxyClientService>('RuntimeApiProxyClientService', ['readSource', 'executeAction']);

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                VariableStoreService,
                { provide: RuntimeApiProxyClientService, useValue: proxy },
            ],
        });

        configStore = TestBed.inject(ConfigStoreService);
        variables = TestBed.inject(VariableStoreService);
        configStore.setSiteConfig({
            version: 1,
            domain: 'music.lynxpardelle.com',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'newsletter-signup',
                        proxyActionId: 'mailingListSubscribe',
                        statusTarget: 'remoteStatus.newsletterSignup',
                        inputFields: ['email', 'language'],
                    },
                ],
            },
            site: {},
        } as any);
        configStore.setPageConfig({
            version: 1,
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            rootIds: [],
        } as any);

        context = {
            event: {
                componentId: 'newsletterForm',
                eventName: 'submit',
                eventData: {
                    email: 'listener@example.test',
                    language: 'en',
                    ignored: 'do-not-send',
                },
            },
            host: {},
        };
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('executes a configured proxy action with only allowlisted input fields', async () => {
        proxy.executeAction.and.resolveTo({
            ok: true,
            data: { status: 'subscribed' },
        });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['newsletter-signup']);

        expect(proxy.executeAction).toHaveBeenCalledOnceWith({
            domain: 'music.lynxpardelle.com',
            pageId: 'default',
            actionId: 'mailingListSubscribe',
            input: {
                email: 'listener@example.test',
                language: 'en',
            },
        });
        expect(variables.get('remoteStatus.newsletterSignup.state')).toBe('success');
        expect(variables.get('remoteStatus.newsletterSignup.error')).toBeNull();
        expect(variables.get('remoteStatus.newsletterSignup.data')).toEqual({ status: 'subscribed' });
    });

    it('writes an error status when a configured proxy action fails', async () => {
        proxy.executeAction.and.rejectWith(new Error('Action failed'));

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['newsletter-signup']);

        expect(variables.get('remoteStatus.newsletterSignup.state')).toBe('error');
        expect(variables.get('remoteStatus.newsletterSignup.error')).toBe('Action failed');
    });

    it('ignores unknown action ids', async () => {
        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['missing-action']);

        expect(proxy.executeAction).not.toHaveBeenCalled();
    });
});
