import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ContentHubClientService } from '@/app/shared/services/content-hub-client.service';
import { RuntimeApiProxyClientService } from '@/app/shared/services/runtime-api-proxy-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import { InteractionScopeService } from '../../../components/interaction-scope/interaction-scope.service';
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
                InteractionScopeService,
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

    it('blocks configured proxy actions that require a direct user gesture', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'record-interaction',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubRecordInteraction',
                        statusTarget: 'remoteStatus.contentHub.interaction',
                        requiresUserGesture: true,
                        inputFields: ['articleId', 'eventType'],
                        contentHub: {
                            action: 'recordInteraction',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'autoTracker',
                eventName: 'sectionView',
                eventData: {
                    articleId: 'art_intro',
                    eventType: 'reaction',
                },
                userGesture: false,
            },
            host: {},
        };

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['record-interaction']);

        expect(contentHub.executeAction).not.toHaveBeenCalled();
        expect(variables.get('remoteStatus.contentHub.interaction.state')).toBe('error');
        expect(variables.get('remoteStatus.contentHub.interaction.error')).toBe('This action requires a direct user action.');
    });

    it('blocks content hub actions when allowlisted id fields are invalid', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'schedule-article',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubSchedule',
                        statusTarget: 'remoteStatus.contentHub.schedule',
                        inputFields: ['articleId', 'revisionId', 'publishAt'],
                        contentHub: {
                            action: 'schedule',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'scheduleButton',
                eventName: 'pressed',
                eventData: {
                    articleId: '{articleId}',
                    revisionId: 'rev_ok',
                    publishAt: '2026-06-30T07:11:00-06:00',
                },
                userGesture: true,
            },
            host: {},
        };

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['schedule-article']);

        expect(contentHub.executeAction).not.toHaveBeenCalled();
        expect(variables.get('remoteStatus.contentHub.schedule.state')).toBe('error');
        expect(variables.get('remoteStatus.contentHub.schedule.error')).toBe('Select a valid content item before continuing.');
    });

    it('blocks targeted content hub actions when required ids are missing', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'update-package',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubUpdatePackage',
                        statusTarget: 'remoteStatus.contentHub.update',
                        inputFields: ['articleId', 'articleTitle'],
                        contentHub: {
                            action: 'updatePackage',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'saveButton',
                eventName: 'pressed',
                eventData: {
                    articleTitle: 'Sin artículo',
                },
                userGesture: true,
            },
            host: {},
        };

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['update-package']);

        expect(contentHub.executeAction).not.toHaveBeenCalled();
        expect(variables.get('remoteStatus.contentHub.update.state')).toBe('error');
        expect(variables.get('remoteStatus.contentHub.update.error')).toBe('Select a valid content item before continuing.');
    });

    it('allows taxonomy creation without a pre-existing taxonomy id', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'upsert-taxonomy',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubUpsertTaxonomy',
                        statusTarget: 'remoteStatus.contentHub.taxonomy',
                        inputFields: ['taxonomyKind', 'taxonomyId', 'taxonomyLabel', 'slug'],
                        contentHub: {
                            action: 'upsertTaxonomy',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'taxonomyButton',
                eventName: 'pressed',
                eventData: {
                    taxonomyKind: 'category',
                    taxonomyLabel: 'Web',
                    slug: 'web',
                },
                userGesture: true,
            },
            host: {},
        };
        contentHub.executeAction.and.resolveTo({ ok: true, data: { taxonomy: { taxonomyId: 'web' } } });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['upsert-taxonomy']);

        expect(contentHub.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            input: jasmine.objectContaining({
                taxonomyKind: 'category',
                taxonomyLabel: 'Web',
                slug: 'web',
            }),
        }));
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
        expect(variables.get('remoteStatus.contentHub.create.revisionId')).toBe('rev_created');
        expect(variables.get('remoteStatus.contentHub.create.latestRevisionId')).toBe('rev_created');
        expect(variables.get('remoteStatus.contentHub.create.path')).toBe('/blog/web/intro');
        expect(variables.get('remoteStatus.contentHub.create.status')).toBe('draft');
    });

    it('extracts safe media references from content hub action responses', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'upload-asset',
                        kind: 'content-hub',
                        contentHub: {
                            action: 'uploadAsset',
                            hubId: 'zoosite-main',
                        },
                        statusTarget: 'remoteStatus.contentHub.upload',
                    },
                ],
            },
            site: {},
        } as any);
        contentHub.executeAction.and.resolveTo({
            ok: true,
            data: {
                asset: {
                    assetId: 'asset_intro',
                    fileName: 'intro.png',
                },
            },
        });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['upload-asset']);

        expect(variables.get('remoteStatus.contentHub.upload.assetId')).toBe('asset_intro');
        expect(variables.get('remoteStatus.contentHub.upload.fileName')).toBe('intro.png');
    });

    it('uses interaction scope values when a button triggers a configured action inside a scope', async () => {
        const scope = TestBed.inject(InteractionScopeService);
        scope.configure({ scopeId: 'articleForm' });
        scope.registerField({ fieldId: 'articleTitle', initialValue: '', required: true });
        scope.registerField({ fieldId: 'articleLanguage', initialValue: 'es', required: true });
        scope.registerField({ fieldId: 'articleCategory', initialValue: '', required: true });
        scope.registerField({ fieldId: 'articleTags', initialValue: '', required: false });
        scope.registerField({ fieldId: 'articleSlug', initialValue: '', required: true });
        scope.setFieldValue('articleTitle', 'Artículo desde scope');
        scope.setFieldValue('articleLanguage', 'es');
        scope.setFieldValue('articleCategory', 'web');
        scope.setFieldValue('articleTags', 'seo, builder');
        scope.setFieldValue('articleSlug', 'articulo-desde-scope');
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'create-article',
                        kind: 'content-hub',
                        contentHub: {
                            action: 'createArticle',
                            hubId: 'zoosite-main',
                        },
                        inputFields: [
                            'articleTitle',
                            'articleLanguage',
                            'articleCategory',
                            'articleTags',
                            'articleSlug',
                        ],
                    },
                ],
            },
            site: {},
        } as any);
        contentHub.executeAction.and.resolveTo({ ok: true, data: { article: { articleId: 'art_scope' } } });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle({
            ...context,
            event: {
                componentId: 'createButton',
                eventName: 'pressed',
                eventData: {},
            },
            host: { interactionScope: scope, scopeId: 'articleForm' },
        }, ['create-article']);

        expect(contentHub.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            input: {
                contentHub: {
                    action: 'createArticle',
                    hubId: 'zoosite-main',
                },
                articleTitle: 'Artículo desde scope',
                articleLanguage: 'es',
                articleCategory: 'web',
                articleTags: 'seo, builder',
                articleSlug: 'articulo-desde-scope',
            },
        }));
    });

    it('uses generic table rowData for configured action input fields', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'restore-revision',
                        kind: 'content-hub',
                        contentHub: {
                            action: 'restoreRevision',
                            hubId: 'zoosite-main',
                        },
                        inputFields: ['articleId', 'revisionId'],
                    },
                ],
            },
            site: {},
        } as any);
        contentHub.executeAction.and.resolveTo({ ok: true, data: { articleId: 'art_1', revisionId: 'rev_1' } });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle({
            ...context,
            event: {
                componentId: 'versionsTable',
                eventName: 'rowAction',
                eventData: {
                    rowData: {
                        articleId: 'art_1',
                        revisionId: 'rev_1',
                    },
                },
            },
        }, ['restore-revision']);

        expect(contentHub.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            input: jasmine.objectContaining({
                articleId: 'art_1',
                revisionId: 'rev_1',
            }),
        }));
    });

    it('extracts taxonomy, comment and interaction response references', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'record-interaction',
                        kind: 'content-hub',
                        contentHub: {
                            action: 'recordInteraction',
                            hubId: 'zoosite-main',
                        },
                        statusTarget: 'remoteStatus.contentHub.interaction',
                    },
                ],
            },
            site: {},
        } as any);
        contentHub.executeAction.and.resolveTo({
            ok: true,
            data: {
                taxonomy: { taxonomyId: 'web' },
                comment: { commentId: 'cmt_1' },
                interaction: { interactionId: 'evt_1' },
            },
        });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['record-interaction']);

        expect(variables.get('remoteStatus.contentHub.interaction.taxonomyId')).toBe('web');
        expect(variables.get('remoteStatus.contentHub.interaction.commentId')).toBe('cmt_1');
        expect(variables.get('remoteStatus.contentHub.interaction.interactionId')).toBe('evt_1');
    });

    it('writes an error status when a configured proxy action fails', async () => {
        const failure = new Error('Action failed') as Error & { requestId?: string };
        failure.requestId = 'req-safe-456';
        proxy.executeAction.and.rejectWith(failure);

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['newsletter-signup']);

        expect(variables.get('remoteStatus.newsletterSignup.state')).toBe('error');
        expect(variables.get('remoteStatus.newsletterSignup.error')).toBe('Action failed');
        expect(variables.get('remoteStatus.newsletterSignup.requestId')).toBe('req-safe-456');
    });

    it('ignores unknown action ids', async () => {
        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['missing-action']);

        expect(proxy.executeAction).not.toHaveBeenCalled();
    });
});
