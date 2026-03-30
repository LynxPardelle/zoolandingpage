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
    const setAuxiliaryComponentsFromPayload = jasmine.createSpy('setAuxiliaryComponentsFromPayload');
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
        setAuxiliaryComponentsFromPayload.calls.reset();
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
                        loadDebugWorkspacePageConfig: jasmine.createSpy('loadDebugWorkspacePageConfig').and.resolveTo(null),
                        loadDebugWorkspaceComponents: jasmine.createSpy('loadDebugWorkspaceComponents').and.resolveTo(null),
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
                        setAuxiliaryComponentsFromPayload,
                        setDraftExportContext,
                    },
                },
                {
                    provide: AngoraCombosService,
                    useValue: {
                        applyPayload,
                        scheduleCssCreate,
                        initializeBaseCombos: () => undefined,
                        revealCssTimer: () => undefined,
                        stopCssRuntime: () => undefined,
                    },
                },
                {
                    provide: AnalyticsService,
                    useValue: {
                        initializeRuntimeState: () => undefined,
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
        const expectedModalRootIds: string[] = [];

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
            modalRootIds: expectedModalRootIds,
        });
    });

    it('queues a fresh draft initialization when navigation changes during an active load', async () => {
        const service = TestBed.inject(RuntimeService);
        const expectedModalRootIds: string[] = [];
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
            modalRootIds: expectedModalRootIds,
        });
    });

    it('skips bootstrap when no draft identity is resolved yet', async () => {
        const service = TestBed.inject(RuntimeService);
        const draftRuntime = TestBed.inject(DraftRuntimeService);
        const expectedModalRootIds: string[] = [];
        spyOn(draftRuntime, 'resolveActiveDraftContext').and.resolveTo({
            domain: '',
            pageId: '',
            path: '/',
            route: null,
            explicitPageId: false,
        });

        await service.initialize('es');

        expect(bootstrapLoad).not.toHaveBeenCalled();
        expect(service.rootComponentsIds()).toEqual([]);
        expect(service.modalRootIds()).toEqual(expectedModalRootIds);
        expect(setDraftExportContext).toHaveBeenCalledWith({
            domain: '',
            pageId: '',
            rootIds: [],
            modalRootIds: expectedModalRootIds,
        });
    });

    it('loads authored debug workspace roots when debug workspace is enabled', async () => {
        const service = TestBed.inject(RuntimeService);
        const configSource = TestBed.inject(ConfigSourceService) as jasmine.SpyObj<ConfigSourceService>;
        const host = document.createElement('div');

        configSource.loadDebugWorkspacePageConfig.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            rootIds: ['debugWorkspaceRoot'],
            modalRootIds: ['modalDemoRoot'],
        });
        configSource.loadDebugWorkspaceComponents.and.resolveTo({
            version: 1,
            domain: 'debug-workspace',
            pageId: 'default',
            components: {
                debugWorkspaceRoot: {
                    id: 'debugWorkspaceRoot',
                    type: 'container',
                    config: { tag: 'div', components: [] },
                },
            },
        });

        service.connect({
            host,
            destroyRef: { onDestroy: () => undefined } as any,
            showDebugWorkspace: () => true,
            currentLanguage: () => 'es',
        });

        await service.initialize('es');

        expect(service.debugWorkspaceRootIds()).toEqual(['debugWorkspaceRoot']);
        expect(service.modalRootIds()).toEqual(['modalDemoRoot']);
        expect(setAuxiliaryComponentsFromPayload).toHaveBeenCalledWith('debug-workspace', jasmine.objectContaining({
            components: jasmine.any(Object),
        }));
    });
});
