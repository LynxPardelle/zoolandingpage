import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TRuntimeBundlePayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { TestBed } from '@angular/core/testing';
import { ConfigApiService } from './config-api.service';
import { ConfigSourceService } from './config-source.service';
import { DraftConfigLoaderService } from './draft-config-loader.service';
import { LanguageService } from './language.service';

describe('ConfigSourceService', () => {
    let originalDraftsEnabled: boolean;

    const themePalette = {
        bgColor: '#ffffff',
        textColor: '#111111',
        titleColor: '#111111',
        linkColor: '#0055ff',
        accentColor: '#22aa55',
        secondaryBgColor: '#f4f4f4',
        secondaryTextColor: '#222222',
        secondaryTitleColor: '#111111',
        secondaryLinkColor: '#6633ff',
        secondaryAccentColor: '#ff9933',
        successColor: '#198754',
        onSuccessColor: '#ffffff',
        errorColor: '#dc3545',
        onErrorColor: '#ffffff',
        warningColor: '#f5b942',
        onWarningColor: '#111111',
        infoColor: '#0d6efd',
        onInfoColor: '#ffffff',
    };

    const siteConfigPayload: TDraftSiteConfigPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        aliases: ['alecfest-voliii.zoolandingpage.com.mx'],
        defaultPageId: 'default',
        routes: [{ path: '/', pageId: 'default', label: 'Home' }],
        site: {
            appIdentity: {
                identifier: 'alecfestvoliiicom',
                name: 'Alecfest',
            },
            theme: {
                palettes: {
                    light: themePalette,
                    dark: themePalette,
                },
            },
            i18n: {
                defaultLanguage: 'es',
                supportedLanguages: ['es'],
            },
        },
    };

    const pageConfigPayload: TPageConfigPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        rootIds: ['home'],
        modalRootIds: [],
    };

    const componentsPayload: TComponentsPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        components: [
            {
                id: 'home',
                type: 'container',
                config: { components: [] },
            },
        ],
    };

    const i18nPayload: TI18nPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        lang: 'es',
        dictionary: {},
    };

    const createRuntimeBundle = (overrides: Partial<TRuntimeBundlePayload> = {}): TRuntimeBundlePayload => ({
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        sourceStage: 'published',
        versionId: '20260405T000000Z-test',
        lang: 'es',
        generatedAt: '2026-04-05T00:00:00Z',
        route: { pageId: 'default', path: '/', label: 'Home' },
        lifecycle: {
            updatedBy: 'test',
            status: 'active',
            fallbackMode: 'system',
            updatedAt: '2026-04-05T00:00:00Z',
        },
        siteConfig: siteConfigPayload,
        pageConfig: pageConfigPayload,
        components: componentsPayload,
        variables: null,
        angoraCombos: null,
        i18n: i18nPayload,
        metadata: {
            requestId: 'req-1',
            requestedDomain: 'alecfest-voliii.zoolandingpage.com.mx',
            resolvedAlias: 'alecfest-voliii.zoolandingpage.com.mx',
            resolvedPath: '/',
            bucket: 'bucket',
            prefix: 'prefix',
        },
        ...overrides,
    });

    const variablesPayload: TVariablesPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        variables: { nav: [] },
    };

    const combosPayload: TAngoraCombosPayload = {
        version: 1,
        domain: 'alecfest-voliii.com',
        pageId: 'default',
        combos: { hero: ['ank-bg-primary'] },
    };

    beforeEach(() => {
        originalDraftsEnabled = environment.drafts.enabled;
        (environment.drafts as { enabled: boolean }).enabled = false;

        TestBed.configureTestingModule({
            providers: [
                ConfigSourceService,
                {
                    provide: ConfigApiService,
                    useValue: {
                        getRuntimeBundle: jasmine.createSpy('getRuntimeBundle').and.resolveTo(createRuntimeBundle()),
                        getSiteConfig: jasmine.createSpy('getSiteConfig').and.resolveTo(null),
                        getPageConfig: jasmine.createSpy('getPageConfig').and.resolveTo(null),
                        getComponents: jasmine.createSpy('getComponents').and.resolveTo(null),
                        getVariables: jasmine.createSpy('getVariables').and.resolveTo(variablesPayload),
                        getAngoraCombos: jasmine.createSpy('getAngoraCombos').and.resolveTo(combosPayload),
                        getI18n: jasmine.createSpy('getI18n').and.resolveTo(null),
                        getDebugWorkspacePageConfig: jasmine.createSpy('getDebugWorkspacePageConfig').and.resolveTo(null),
                        getDebugWorkspaceComponents: jasmine.createSpy('getDebugWorkspaceComponents').and.resolveTo(null),
                        getDebugWorkspaceAngoraCombos: jasmine.createSpy('getDebugWorkspaceAngoraCombos').and.resolveTo(null),
                    },
                },
                {
                    provide: DraftConfigLoaderService,
                    useValue: {},
                },
                {
                    provide: LanguageService,
                    useValue: {
                        currentLanguage: () => 'es',
                    },
                },
            ],
        });
    });

    afterEach(() => {
        (environment.drafts as { enabled: boolean }).enabled = originalDraftsEnabled;
    });

    it('returns null variables from the bundle without calling the legacy endpoint', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        const result = await service.loadVariables('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(result).toBeNull();
        expect(api.getVariables).not.toHaveBeenCalled();
    });

    it('returns null angora combos from the bundle without calling the legacy endpoint', async () => {
        const service = TestBed.inject(ConfigSourceService);
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;

        const result = await service.loadCombos('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(result).toBeNull();
        expect(api.getAngoraCombos).not.toHaveBeenCalled();
    });

    it('falls back to variables using the canonical bundle identity when the field is absent from the bundle payload', async () => {
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const bundleWithoutVariables = { ...createRuntimeBundle() } as Record<string, unknown>;
        delete bundleWithoutVariables['variables'];
        api.getRuntimeBundle.and.resolveTo(bundleWithoutVariables as unknown as TRuntimeBundlePayload);

        const service = TestBed.inject(ConfigSourceService);
        await service.loadVariables('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(api.getVariables).toHaveBeenCalledWith('alecfest-voliii.com', 'default');
    });

    it('falls back to angora combos using the canonical bundle identity when the field is absent from the bundle payload', async () => {
        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        const bundleWithoutCombos = { ...createRuntimeBundle() } as Record<string, unknown>;
        delete bundleWithoutCombos['angoraCombos'];
        api.getRuntimeBundle.and.resolveTo(bundleWithoutCombos as unknown as TRuntimeBundlePayload);

        const service = TestBed.inject(ConfigSourceService);
        await service.loadCombos('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(api.getAngoraCombos).toHaveBeenCalledWith('alecfest-voliii.com', 'default');
    });

    it('returns bundled variables without hitting the legacy endpoint when they are already present', async () => {
        const bundledVariables: TVariablesPayload = {
            version: 1,
            domain: 'alecfest-voliii.com',
            pageId: 'default',
            variables: { featureFlags: { ready: true } },
        };

        const api = TestBed.inject(ConfigApiService) as jasmine.SpyObj<ConfigApiService>;
        api.getRuntimeBundle.and.resolveTo(createRuntimeBundle({ variables: bundledVariables }));

        const service = TestBed.inject(ConfigSourceService);
        const result = await service.loadVariables('alecfest-voliii.zoolandingpage.com.mx', 'default');

        expect(result).toEqual(bundledVariables);
        expect(api.getVariables).not.toHaveBeenCalled();
    });
});
