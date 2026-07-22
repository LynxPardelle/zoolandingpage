import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { ComboCatalogClientService } from '@/app/shared/services/combo-catalog-client.service';
import { ContentHubClientService } from '@/app/shared/services/content-hub-client.service';
import { CommerceClientService } from '@/app/shared/services/commerce-client.service';
import { DataSpaceClientService } from '@/app/shared/services/data-space-client.service';
import { IntegrationPlatformClientService } from '@/app/shared/services/integration-platform-client.service';
import {
    SERVER_FEATURE_BROWSER,
    type TServerFeatureBrowser,
} from '@/app/shared/services/server-feature-handoff.service';
import { RuntimeApiProxyClientService } from '@/app/shared/services/runtime-api-proxy-client.service';
import type { TRuntimeApiProxyActionRequest } from '@/app/shared/services/runtime-api-proxy-client.service';
import type { TCommerceBrowserResponse } from '@/app/shared/types/commerce.types';
import type { TIntegrationPlatformBrowserResponse } from '@/app/shared/types/integration-platform.types';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import { InteractionScopeService } from '../../../components/interaction-scope/interaction-scope.service';
import type { EventExecutionContext } from '../event-handler.types';
import { proxyActionHandler } from './proxy-action.handlers';

describe('proxyActionHandler', () => {
    let proxy: jasmine.SpyObj<RuntimeApiProxyClientService>;
    let comboCatalog: jasmine.SpyObj<ComboCatalogClientService>;
    let contentHub: jasmine.SpyObj<ContentHubClientService>;
    let commerce: jasmine.SpyObj<CommerceClientService>;
    let dataSpaces: jasmine.SpyObj<DataSpaceClientService>;
    let integrations: jasmine.SpyObj<IntegrationPlatformClientService>;
    let browser: jasmine.SpyObj<TServerFeatureBrowser>;
    let configStore: ConfigStoreService;
    let variables: VariableStoreService;
    let context: EventExecutionContext;

    beforeEach(() => {
        proxy = jasmine.createSpyObj<RuntimeApiProxyClientService>('RuntimeApiProxyClientService', ['readSource', 'executeAction']);
        comboCatalog = jasmine.createSpyObj<ComboCatalogClientService>('ComboCatalogClientService', ['readSource', 'executeAction']);
        contentHub = jasmine.createSpyObj<ContentHubClientService>('ContentHubClientService', ['readSource', 'executeAction']);
        commerce = jasmine.createSpyObj<CommerceClientService>('CommerceClientService', ['readSource', 'executeAction']);
        dataSpaces = jasmine.createSpyObj<DataSpaceClientService>('DataSpaceClientService', ['readSource', 'executeAction']);
        integrations = jasmine.createSpyObj<IntegrationPlatformClientService>('IntegrationPlatformClientService', ['readSource', 'executeAction']);
        browser = jasmine.createSpyObj<TServerFeatureBrowser>('ServerFeatureBrowser', ['currentUrl', 'replaceUrl', 'navigate']);
        browser.currentUrl.and.returnValue('http://localhost/context.html');

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                InteractionScopeService,
                VariableStoreService,
                { provide: RuntimeApiProxyClientService, useValue: proxy },
                { provide: ComboCatalogClientService, useValue: comboCatalog },
                { provide: ContentHubClientService, useValue: contentHub },
                { provide: CommerceClientService, useValue: commerce },
                { provide: DataSpaceClientService, useValue: dataSpaces },
                { provide: IntegrationPlatformClientService, useValue: integrations },
                { provide: SERVER_FEATURE_BROWSER, useValue: browser },
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

    it('does not execute an action outside its declared page scope', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'music.lynxpardelle.com',
            routes: [],
            runtime: {
                apiActions: [{
                    id: 'page-scoped-action',
                    pageIds: ['account'],
                }],
            },
            site: {},
        } as any);
        proxy.executeAction.and.resolveTo({ ok: true, data: {} });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['page-scoped-action']);

        expect(proxy.executeAction).not.toHaveBeenCalled();
    });

    it('dispatches the three configured server feature action kinds without the generic proxy', async () => {
        dataSpaces.executeAction.and.resolveTo({ ok: true, data: { recordId: 'basic' } });
        commerce.executeAction.and.resolveTo({ ok: true, data: { stockId: 'stock-basic' } });
        integrations.executeAction.and.resolveTo({ ok: true, data: { connection: { connectionId: 'stripe-main' } } });
        const actions = [
            {
                id: 'save-record', kind: 'data-space', inputFields: ['collectionId', 'recordId', 'data'],
                dataSpace: { action: 'createRecord', spaceId: 'catalog' },
            },
            {
                id: 'adjust-stock', kind: 'commerce', inputFields: ['stockId', 'delta', 'expectedRevision'],
                commerce: { action: 'adjustStock' },
            },
            {
                id: 'disable-connection', kind: 'integrations', inputFields: ['connectionId', 'expectedRevision'],
                integrations: { action: 'disable' },
            },
        ];
        configStore.setSiteConfig({
            version: 1, domain: 'preview.example.test', routes: [], runtime: { apiActions: actions }, site: {},
        } as any);
        context = {
            event: {
                componentId: 'admin-action', eventName: 'click', userGesture: true,
                eventData: {
                    collectionId: 'products', recordId: 'basic', data: { title: 'Basic' },
                    stockId: 'stock-basic', delta: 2, expectedRevision: 3,
                    connectionId: 'stripe-main', providerAccountId: 'must-not-travel',
                },
            },
            host: {},
        };
        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());

        for (const action of actions) await handler.handle(context, [action.id]);

        expect(dataSpaces.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            actionId: 'save-record',
            input: {
                dataSpace: { action: 'createRecord', spaceId: 'catalog' },
                collectionId: 'products', recordId: 'basic', data: { title: 'Basic' },
            },
        }));
        expect(commerce.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            actionId: 'adjust-stock',
            input: { commerce: { action: 'adjustStock' }, stockId: 'stock-basic', delta: 2, expectedRevision: 3 },
        }));
        expect(integrations.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            actionId: 'disable-connection',
            input: { integrations: { action: 'disable' }, connectionId: 'stripe-main', expectedRevision: 3 },
        }));
        expect(proxy.executeAction).not.toHaveBeenCalled();
    });

    it('cleans OAuth query fields before sending onboarding return and preserves other query fields', async () => {
        configStore.setSiteConfig({
            version: 1, domain: 'preview.example.test', routes: [],
            runtime: { apiActions: [{
                id: 'oauth-return', kind: 'integrations',
                integrations: { action: 'stripeOnboardingReturn', bindingId: 'stripe-main' },
                trigger: 'route-load', pageIds: ['default'],
            }] }, site: {},
        } as any);
        browser.currentUrl.and.returnValue(
            'https://test.zoolandingpage.com.mx/conectar?draftDomain=preview.example.test&state=opaque&code=single-use&lang=es',
        );
        integrations.executeAction.and.callFake(<T = unknown>(
            request: TRuntimeApiProxyActionRequest,
        ): Promise<TIntegrationPlatformBrowserResponse<T>> => {
            expect(browser.replaceUrl).toHaveBeenCalledBefore(integrations.executeAction);
            return Promise.resolve({
                ok: true,
                data: {
                    status: 'ready',
                    chargesEnabled: true,
                    payoutsEnabled: true,
                    detailsSubmitted: true,
                    capabilitiesReady: true,
                    requirementsDueCount: 0,
                    state: 'opaque',
                    code: 'single-use',
                    redirectUrl: 'https://connect.stripe.com/must-not-survive',
                    connection: { connectionId: 'stripe-main' },
                } as T,
            });
        });
        const setRuntimeValueSpy = spyOn(variables, 'setRuntimeValue').and.callThrough();

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['oauth-return']);

        expect(browser.replaceUrl).toHaveBeenCalledOnceWith('/conectar?draftDomain=preview.example.test&lang=es');
        expect(integrations.executeAction).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            input: {
                integrations: { action: 'stripeOnboardingReturn' },
                bindingId: 'stripe-main', state: 'opaque', code: 'single-use',
            },
        }));
        const allStatusWrites = JSON.stringify(setRuntimeValueSpy.calls.allArgs());
        expect(allStatusWrites).not.toContain('opaque');
        expect(allStatusWrites).not.toContain('single-use');
        expect(allStatusWrites).not.toContain('stripe.com');
        expect(allStatusWrites).not.toContain('connectionId');
        expect(variables.get('remoteStatus.oauth-return.data')).toEqual({
            status: 'ready',
            chargesEnabled: true,
            payoutsEnabled: true,
            detailsSubmitted: true,
            capabilitiesReady: true,
            requirementsDueCount: 0,
        });
    });

    it('navigates transient portal, Checkout, and onboarding handoffs without persisting response data', async () => {
        const actions = [
            {
                id: 'portal', kind: 'commerce', requiresUserGesture: true, inputFields: ['subscriptionId'],
                commerce: { action: 'openPortal' },
            },
            {
                id: 'checkout', kind: 'commerce', requiresUserGesture: true, inputFields: ['lines'],
                commerce: { action: 'admitCheckout' },
            },
            {
                id: 'onboarding', kind: 'integrations', requiresUserGesture: true,
                integrations: { action: 'stripeOnboardingStart', bindingId: 'stripe-main' },
            },
        ];
        configStore.setSiteConfig({
            version: 1, domain: 'preview.example.test', routes: [], runtime: { apiActions: actions }, site: {},
        } as any);
        commerce.executeAction.and.callFake(<T = unknown>(
            request: TRuntimeApiProxyActionRequest,
        ): Promise<TCommerceBrowserResponse<T>> => Promise.resolve({
            data: (request.actionId === 'checkout'
                ? {
                    redirectUrl: 'https://checkout.stripe.com/c/pay/test',
                    expiresAt: Math.floor(Date.now() / 1000) + 300,
                    fiscalAccessProof: 'must-never-be-persisted',
                }
                : {
                    redirectUrl: 'https://billing.stripe.com/p/session/test',
                    expiresAt: Math.floor(Date.now() / 1000) + 300,
                }) as T,
        }));
        integrations.executeAction.and.resolveTo({
            ok: true, data: { handoffUrl: 'https://connect.stripe.com/setup/test' },
        });
        const setRuntimeValueSpy = spyOn(variables, 'setRuntimeValue').and.callThrough();
        context = {
            event: {
                componentId: 'button', eventName: 'click', userGesture: true,
                eventData: {
                    subscriptionId: 'sub-basic',
                    lines: [{ offerVersionId: 'offer-basic-v1', quantity: 1 }],
                },
            },
            host: {},
        };
        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());

        await handler.handle(context, ['portal']);
        await handler.handle(context, ['checkout']);
        await handler.handle(context, ['onboarding']);

        expect(browser.navigate.calls.allArgs()).toEqual([
            ['https://billing.stripe.com/p/session/test'],
            ['https://checkout.stripe.com/c/pay/test'],
            ['https://connect.stripe.com/setup/test'],
        ]);
        expect(variables.get('remoteStatus.portal.data')).toBeUndefined();
        expect(variables.get('remoteStatus.checkout.data')).toBeUndefined();
        expect(variables.get('remoteStatus.onboarding.data')).toBeUndefined();
        const allStatusWrites = JSON.stringify(setRuntimeValueSpy.calls.allArgs());
        expect(allStatusWrites).not.toContain('redirectUrl');
        expect(allStatusWrites).not.toContain('handoffUrl');
        expect(allStatusWrites).not.toContain('stripe.com');
        expect(allStatusWrites).not.toContain('fiscalAccessProof');
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

    it('executes combo catalog actions with safe combo context and allowlisted event data only', async () => {
        configStore.setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                apiActions: [
                    {
                        id: 'update-combo',
                        kind: 'combo-catalog',
                        proxyActionId: 'comboCatalogUpdateCombo',
                        statusTarget: 'remoteStatus.comboCatalog.update',
                        inputFields: ['comboId', 'credentialRef', 'groups', 'scope', 'updatedAt'],
                        comboCatalog: {
                            action: 'updateCombo',
                        },
                    },
                ],
            },
            site: {},
        } as any);
        context = {
            event: {
                componentId: 'comboUpdateButton',
                eventName: 'pressed',
                eventData: {
                    comboId: 'HeroCard',
                    credentialRef: 'ssm:/must-not-travel',
                    groups: 'corporativo, landing',
                    scope: 'draft',
                    tableName: 'server-only',
                    updatedAt: '2026-07-01T18:11:00-06:00',
                },
                userGesture: true,
            },
            host: {},
        };
        comboCatalog.executeAction.and.resolveTo({
            ok: true,
            data: { combo: { combo: 'HeroCard' } },
        });

        const handler = TestBed.runInInjectionContext(() => proxyActionHandler());
        await handler.handle(context, ['update-combo']);

        expect(proxy.executeAction).not.toHaveBeenCalled();
        expect(contentHub.executeAction).not.toHaveBeenCalled();
        expect(comboCatalog.executeAction).toHaveBeenCalledOnceWith({
            domain: 'zoositioweb.com.mx',
            pageId: 'default',
            actionId: 'comboCatalogUpdateCombo',
            input: {
                action: 'updateCombo',
                comboId: 'HeroCard',
                groups: 'corporativo, landing',
                scope: 'draft',
                updatedAt: '2026-07-01T18:11:00-06:00',
            },
        });
        expect(variables.get('remoteStatus.comboCatalog.update.state')).toBe('success');
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
