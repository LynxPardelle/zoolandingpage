import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ContentHubClientService } from '@/app/shared/services/content-hub-client.service';
import { RuntimeApiProxyClientService } from '@/app/shared/services/runtime-api-proxy-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { proxyActionHandler } from './proxy-action.handlers';

describe('proxyActionHandler', () => {
    let proxy: jasmine.SpyObj<RuntimeApiProxyClientService>;
    let contentHub: jasmine.SpyObj<ContentHubClientService>;
    let configStore: ConfigStoreService;
    let variables: VariableStoreService;
    let context: EventExecutionContext;

    beforeEach(() => {
        proxy = jasmine.createSpyObj<RuntimeApiProxyClientService>('RuntimeApiProxyClientService', ['readSource', 'executeAction']);
        contentHub = jasmine.createSpyObj<ContentHubClientService>('ContentHubClientService', ['readSource', 'executeAction']);

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                VariableStoreService,
                { provide: RuntimeApiProxyClientService, useValue: proxy },
                { provide: ContentHubClientService, useValue: contentHub },
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

    it('executes content hub actions with public hub context and allowlisted event data only', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'publish-article',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubPublish',
                        statusTarget: 'remoteStatus.contentHub.publish',
                        inputFields: ['articleId', 'language', 'revisionId', 'publishMessage'],
                        contentHub: {
                            action: 'publish',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'publishButton',
                eventName: 'click',
                eventData: {
                    articleId: 'intro',
                    language: 'es',
                    revisionId: 'rev-1',
                    publishMessage: 'Ready',
                    serverPolicy: { allow: true },
                    credentialRef: 'ssm:/must-not-travel',
                },
            },
            host: {},
        };
        contentHub.executeAction.and.resolveTo({
            ok: true,
            data: { status: 'published' },
        });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['publish-article']);

        expect(proxy.executeAction).not.toHaveBeenCalled();
        expect(contentHub.executeAction).toHaveBeenCalledOnceWith({
            domain: 'zoositioweb.com.mx',
            pageId: 'default',
            actionId: 'contentHubPublish',
            input: {
                contentHub: {
                    action: 'publish',
                    hubId: 'zoosite-main',
                },
                articleId: 'intro',
                language: 'es',
                revisionId: 'rev-1',
                publishMessage: 'Ready',
            },
        });
    });

    it('mirrors safe response identifiers into the configured action status target', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'create-article',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubCreateArticle',
                        statusTarget: 'remoteStatus.contentHub.create',
                        inputFields: ['title', 'language'],
                        contentHub: {
                            action: 'createArticle',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'createArticleButton',
                eventName: 'pressed',
                eventData: {
                    title: 'Intro',
                    language: 'es',
                },
            },
            host: {},
        };
        contentHub.executeAction.and.resolveTo({
            ok: true,
            data: {
                article: {
                    articleId: 'art_created',
                    latestRevisionId: 'rev_created',
                    path: '/blog/web/intro',
                    status: 'draft',
                },
            },
        });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['create-article']);

        expect(variables.get('remoteStatus.contentHub.create.articleId')).toBe('art_created');
        expect(variables.get('remoteStatus.contentHub.create.latestRevisionId')).toBe('rev_created');
        expect(variables.get('remoteStatus.contentHub.create.path')).toBe('/blog/web/intro');
        expect(variables.get('remoteStatus.contentHub.create.status')).toBe('draft');
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
