import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { AngoraCombosService } from '@/app/shared/services/angora-combos.service';
import { ConfigBootstrapService } from '@/app/shared/services/config-bootstrap.service';
import { ConfigSourceService } from '@/app/shared/services/config-source.service';
import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { DomainResolverService } from '@/app/shared/services/domain-resolver.service';
import { DraftRegistryService } from '@/app/shared/services/draft-registry.service';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RuntimeService } from './runtime.service';

describe('RuntimeService', () => {
    const originalUrl = window.location.pathname + window.location.search + window.location.hash;
    const setExternalComponentsFromPayload = jasmine.createSpy('setExternalComponentsFromPayload');
    const setDraftExportContext = jasmine.createSpy('setDraftExportContext');
    const applyPayload = jasmine.createSpy('applyPayload');
    const scheduleCssCreate = jasmine.createSpy('scheduleCssCreate');
    let loadSiteConfig: jasmine.Spy;
    let bootstrapLoad: jasmine.Spy;

    beforeEach(() => {
        loadSiteConfig = jasmine.createSpy('loadSiteConfig').and.resolveTo({
            version: 1,
            domain: 'pamelabetancourt.preview',
            defaultPageId: 'home',
            routes: [
                { path: '/home', pageId: 'home' },
                { path: '/servicios', pageId: 'servicios' },
            ],
        });

        bootstrapLoad = jasmine.createSpy('load').and.callFake(async ({ domain, pageId, lang }: { domain?: string; pageId?: string; lang?: string }) => ({
            domain: domain ?? 'pamelabetancourt.preview',
            pageId: pageId ?? 'home',
            structuredDataApplied: false,
            pageConfig: {
                version: 1,
                domain: domain ?? 'pamelabetancourt.preview',
                pageId: pageId ?? 'home',
                rootIds: [`${ pageId ?? 'home' }-root`],
                modalRootIds: [],
            },
            components: {
                version: 1,
                domain: domain ?? 'pamelabetancourt.preview',
                pageId: pageId ?? 'home',
                components: {
                    [`${ pageId ?? 'home' }Root`]: {
                        id: `${ pageId ?? 'home' }Root`,
                        type: 'container',
                        config: { components: [] },
                    },
                },
            },
            combos: lang ? { version: 1, tokens: [] } : null,
        }));

        setExternalComponentsFromPayload.calls.reset();
        setDraftExportContext.calls.reset();
        applyPayload.calls.reset();
        scheduleCssCreate.calls.reset();

        TestBed.configureTestingModule({
            providers: [
                RuntimeService,
                DraftRuntimeService,
                {
                    provide: DomainResolverService,
                    useValue: {
                        resolveDomain: () => ({ domain: 'pamelabetancourt.preview' }),
                    },
                },
                {
                    provide: ConfigSourceService,
                    useValue: {
                        loadSiteConfig,
                    },
                },
                {
                    provide: DraftRegistryService,
                    useValue: {
                        listDrafts: () => of([]),
                    },
                },
                {
                    provide: ConfigBootstrapService,
                    useValue: {
                        load: bootstrapLoad,
                    },
                },
                {
                    provide: ConfigurationsOrchestratorService,
                    useValue: {
                        setExternalComponentsFromPayload,
                        setDraftExportContext,
                    },
                },
                {
                    provide: AngoraCombosService,
                    useValue: {
                        applyPayload,
                        scheduleCssCreate,
                    },
                },
                {
                    provide: AnalyticsService,
                    useValue: {
                        track: async () => undefined,
                        promptForConsentIfNeeded: () => undefined,
                        startPageEngagementTracking: () => undefined,
                        stopPageEngagementTracking: () => undefined,
                    },
                },
            ],
        });
    });

    afterEach(() => {
        window.history.replaceState({}, '', originalUrl);
        TestBed.resetTestingModule();
    });

    it('reinitializes the rendered draft when client navigation changes the route path', async () => {
        const service = TestBed.inject(RuntimeService);

        window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.preview');
        await service.initialize('es');

        expect(bootstrapLoad).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.preview',
            pageId: 'home',
            lang: 'es',
        });
        expect(service.rootComponentsIds()).toEqual(['home-root']);

        window.history.replaceState({}, '', '/servicios?draftDomain=pamelabetancourt.preview');
        await service.initialize('es');

        expect(bootstrapLoad).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.preview',
            pageId: 'servicios',
            lang: 'es',
        });
        expect(service.rootComponentsIds()).toEqual(['servicios-root']);
        expect(setDraftExportContext).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.preview',
            pageId: 'servicios',
            rootIds: ['servicios-root'],
            modalRootIds: [],
        });
    });

    it('queues a fresh draft initialization when navigation changes during an active load', async () => {
        const service = TestBed.inject(RuntimeService);
        let resolveFirstLoad!: () => void;
        let hasResolveFirstLoad = false;
        let firstLoadPending = true;

        bootstrapLoad.and.callFake(({ domain, pageId, lang }: { domain?: string; pageId?: string; lang?: string }) => {
            const createBootPayload = () => ({
                domain: domain ?? 'pamelabetancourt.preview',
                pageId: pageId ?? 'home',
                structuredDataApplied: false,
                pageConfig: {
                    version: 1,
                    domain: domain ?? 'pamelabetancourt.preview',
                    pageId: pageId ?? 'home',
                    rootIds: [`${ pageId ?? 'home' }-root`],
                    modalRootIds: [],
                },
                components: {
                    version: 1,
                    domain: domain ?? 'pamelabetancourt.preview',
                    pageId: pageId ?? 'home',
                    components: {
                        [`${ pageId ?? 'home' }Root`]: {
                            id: `${ pageId ?? 'home' }Root`,
                            type: 'container',
                            config: { components: [] },
                        },
                    },
                },
                combos: lang ? { version: 1, tokens: [] } : null,
            });

            if (firstLoadPending && pageId === 'home') {
                firstLoadPending = false;
                return new Promise((resolve) => {
                    hasResolveFirstLoad = true;
                    resolveFirstLoad = () => resolve(createBootPayload());
                });
            }

            return Promise.resolve(createBootPayload());
        });

        window.history.replaceState({}, '', '/home?draftDomain=pamelabetancourt.preview');
        const firstInitialize = service.initialize('es');
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

        expect(hasResolveFirstLoad).withContext('first draft load resolver should be captured').toBeTrue();
        expect(bootstrapLoad.calls.allArgs()).toEqual([[
            {
                domain: 'pamelabetancourt.preview',
                pageId: 'home',
                lang: 'es',
            },
        ]]);

        window.history.replaceState({}, '', '/servicios?draftDomain=pamelabetancourt.preview');
        const secondInitialize = service.initialize('es');

        resolveFirstLoad();
        await Promise.all([firstInitialize, secondInitialize]);

        expect(bootstrapLoad.calls.allArgs()).toEqual([
            [{
                domain: 'pamelabetancourt.preview',
                pageId: 'home',
                lang: 'es',
            }],
            [{
                domain: 'pamelabetancourt.preview',
                pageId: 'servicios',
                lang: 'es',
            }],
        ]);
        expect(service.rootComponentsIds()).toEqual(['servicios-root']);
        expect(setDraftExportContext).toHaveBeenCalledWith({
            domain: 'pamelabetancourt.preview',
            pageId: 'servicios',
            rootIds: ['servicios-root'],
            modalRootIds: [],
        });
    });
});
