import type { TRuntimeBundlePayload } from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { makeStateKey, REQUEST, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { clearRuntimeBundleServerCacheForTesting, ConfigApiService } from './config-api.service';

describe('ConfigApiService', () => {
    const originalConfigApiUrl = environment.configApiUrl;
    const originalFallbackUrl = environment.configApiServerFallbackUrl;
    const originalRuntimeFallbackUrl = environment.configApiRuntimeFallbackUrl;
    const nativeHistoryReplaceState = History.prototype.replaceState;
    const palette = {
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
    const runtimeBundlePayload: TRuntimeBundlePayload = {
        version: 1,
        domain: 'zoolandingpage.com.mx',
        pageId: 'default',
        sourceStage: 'published',
        versionId: '20260427T205506Z-test',
        lang: 'en',
        generatedAt: '2026-04-27T00:00:00Z',
        route: { path: '/', pageId: 'default', label: 'Home' },
        lifecycle: {
            status: 'active',
            fallbackMode: 'system',
            updatedAt: '2026-04-27T00:00:00Z',
            updatedBy: 'test',
        },
        siteConfig: {
            version: 1,
            domain: 'zoolandingpage.com.mx',
            defaultPageId: 'default',
            aliases: ['test.zoolandingpage.com.mx'],
            routes: [{ path: '/', pageId: 'default', label: 'Home' }],
            site: {
                appIdentity: { identifier: 'zoolandingpagecommx', name: 'ZoolandingPage' },
                theme: {
                    defaultMode: 'light',
                    palettes: {
                        light: palette,
                        dark: palette,
                    },
                },
                seo: {
                    canonicalOrigin: 'https://zoolandingpage.com.mx',
                    robots: 'index,follow,max-image-preview:large',
                },
                i18n: { defaultLanguage: 'en', supportedLanguages: ['en'] },
            },
        },
        pageConfig: {
            version: 1,
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            rootIds: ['home'],
            modalRootIds: [],
            seo: {
                title: 'ZoolandingPage',
                description: 'Landing page service focused on conversion, analytics, and rapid publishing.',
                canonical: 'https://zoolandingpage.com.mx/',
            },
        },
        components: {
            version: 1,
            domain: 'zoolandingpage.com.mx',
            pageId: 'default',
            components: [],
        },
        variables: null,
        angoraCombos: null,
        i18n: null,
        metadata: {
            requestId: 'req-1',
            requestedDomain: 'test.zoolandingpage.com.mx',
            resolvedAlias: 'test.zoolandingpage.com.mx',
            resolvedPath: '/',
            bucket: 'bucket',
            prefix: 'prefix',
        },
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
        clearRuntimeBundleServerCacheForTesting();
        nativeHistoryReplaceState.call(window.history, {}, '', '/context.html');
    });

    afterEach(() => {
        (environment as { configApiUrl: string }).configApiUrl = originalConfigApiUrl;
        (environment as { configApiRuntimeFallbackUrl?: string }).configApiRuntimeFallbackUrl = originalRuntimeFallbackUrl;
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl = originalFallbackUrl;
        clearRuntimeBundleServerCacheForTesting();
        TestBed.resetTestingModule();
    });

    it('uses the runtime fallback endpoint through HttpClient first on SSR so hydration can reuse it', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        const fetchSpy = spyOn(globalThis, 'fetch' as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        spyOn<any>(service, 'resolveCurrentUrl').and.returnValue(new URL('https://test.zoolandingpage.com.mx/'));
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(String(http.get.calls.mostRecent().args[0])).toContain('https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle');
        expect(String(http.get.calls.mostRecent().args[0])).toContain('domain=test.zoolandingpage.com.mx');
    });

    it('uses local draft runtime endpoints first for localhost SSR draft previews', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'http://localhost:4314/?draftDomain=zoolandingpage.com.mx' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        const payload = await service.getRuntimeBundle('zoolandingpage.com.mx', { path: '/', lang: 'es' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).toHaveBeenCalledTimes(1);
        const requestUrl = String(http.get.calls.mostRecent().args[0]);
        expect(requestUrl).toContain('http://localhost:4314/runtime-bundle');
        expect(requestUrl).toContain('domain=zoolandingpage.com.mx');
    });

    it('uses local debug workspace endpoints first for localhost SSR draft previews', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload.pageConfig));

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'http://localhost:4314/?debugWorkspace=true&draftDomain=zoolandingpage.com.mx' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        await service.getDebugWorkspacePageConfig();

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(String(http.get.calls.mostRecent().args[0])).toContain('http://localhost:4314/debug-workspace/page-config');
    });

    it('uses same-origin debug workspace endpoints on non-local hosts only when explicitly enabled', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload.pageConfig));

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/?debugWorkspace=true' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        await service.getDebugWorkspacePageConfig();

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(String(http.get.calls.mostRecent().args[0])).toContain('https://test.zoolandingpage.com.mx/debug-workspace/page-config');
    });

    it('uses the configured API for non-local debug workspace endpoints without the debug query flag', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload.pageConfig));

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        await service.getDebugWorkspacePageConfig();

        expect(http.get).toHaveBeenCalledTimes(1);
        expect(String(http.get.calls.mostRecent().args[0])).toContain('https://api.zoolandingpage.com.mx/debug-workspace/page-config');
    });

    it('reuses a cached SSR runtime bundle for repeated server requests', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        const fetchSpy = spyOn(globalThis, 'fetch' as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);

        await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });
        await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('falls back to the primary runtime endpoint if the raw server endpoint fails', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValues(
            throwError(() => new Error('runtime fallback unavailable')),
            of(runtimeBundlePayload),
        );

        const fetchSpy = spyOn(globalThis, 'fetch' as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        spyOn<any>(service, 'resolveCurrentUrl').and.returnValue(new URL('https://test.zoolandingpage.com.mx/'));
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).toHaveBeenCalledTimes(2);
        expect(String(http.get.calls.argsFor(0)[0])).toContain('https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle');
        expect(String(http.get.calls.argsFor(1)[0])).toContain('https://api.zoolandingpage.com.mx/runtime-bundle');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('uses the runtime fallback endpoint through HttpClient first in the browser when configured', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiRuntimeFallbackUrl?: string }).configApiRuntimeFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        const fetchSpy = spyOn(globalThis, 'fetch' as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        spyOn<any>(service, 'resolveCurrentUrl').and.returnValue(new URL('https://test.zoolandingpage.com.mx/'));
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(String(http.get.calls.mostRecent().args[0])).toContain('https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle');
    });

    it('hydrates the browser runtime bundle from TransferState before making network requests', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiRuntimeFallbackUrl?: string }).configApiRuntimeFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const transferState = new TransferState();
        const cacheKey = 'https://api.zoolandingpage.com.mx/runtime-bundle?domain=test.zoolandingpage.com.mx&lang=en&path=%2F';
        transferState.set(makeStateKey<TRuntimeBundlePayload>(`zlp-runtime-bundle:${ cacheKey }`), runtimeBundlePayload);

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: TransferState, useValue: transferState },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        spyOn<any>(service, 'resolveCurrentUrl').and.returnValue(new URL('https://test.zoolandingpage.com.mx/'));
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).not.toHaveBeenCalled();
        expect(transferState.hasKey(makeStateKey<TRuntimeBundlePayload>(`zlp-runtime-bundle:${ cacheKey }`))).toBeFalse();
    });
});
