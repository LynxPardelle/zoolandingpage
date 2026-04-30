import type { TRuntimeBundlePayload } from '@/app/shared/types/config-payloads.types';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConfigApiService } from './config-api.service';

describe('ConfigApiService', () => {
    const originalConfigApiUrl = environment.configApiUrl;
    const originalFallbackUrl = environment.configApiServerFallbackUrl;
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

    afterEach(() => {
        (environment as { configApiUrl: string }).configApiUrl = originalConfigApiUrl;
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl = originalFallbackUrl;
        TestBed.resetTestingModule();
    });

    it('uses the raw runtime endpoint first on SSR when a server fallback is configured', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        const fetchSpy = spyOn(globalThis, 'fetch' as never).and.resolveTo(new Response(
            JSON.stringify(runtimeBundlePayload),
            {
                status: 200,
                headers: { 'content-type': 'application/json' },
            },
        ) as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).not.toHaveBeenCalled();
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(String(fetchSpy.calls.mostRecent().args[0])).toContain('https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod/runtime-bundle');
        expect(String(fetchSpy.calls.mostRecent().args[0])).toContain('domain=test.zoolandingpage.com.mx');
    });

    it('falls back to the primary runtime endpoint if the raw server endpoint fails', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        const fetchSpy = spyOn(globalThis, 'fetch' as never).and.rejectWith(new Error('raw endpoint unavailable') as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
                { provide: REQUEST, useValue: { url: 'https://test.zoolandingpage.com.mx/' } },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(String(http.get.calls.mostRecent().args[0])).toContain('https://api.zoolandingpage.com.mx/runtime-bundle');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('uses the primary runtime endpoint in the browser even when a server fallback is configured', async () => {
        (environment as { configApiUrl: string }).configApiUrl = 'https://api.zoolandingpage.com.mx';
        (environment as { configApiServerFallbackUrl?: string }).configApiServerFallbackUrl =
            'https://y84vk0v44l.execute-api.us-east-1.amazonaws.com/Prod';

        const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
        http.get.and.returnValue(of(runtimeBundlePayload));

        const fetchSpy = spyOn(globalThis, 'fetch' as never).and.resolveTo(new Response('{}') as never);

        TestBed.configureTestingModule({
            providers: [
                ConfigApiService,
                { provide: HttpClient, useValue: http },
            ],
        });

        const service = TestBed.inject(ConfigApiService);
        const payload = await service.getRuntimeBundle('test.zoolandingpage.com.mx', { path: '/', lang: 'en' });

        expect(payload.domain).toBe('zoolandingpage.com.mx');
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(String(http.get.calls.mostRecent().args[0])).toContain('https://api.zoolandingpage.com.mx/runtime-bundle');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
