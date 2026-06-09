import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ConfigStoreService } from './config-store.service';
import { RuntimeConfigService } from './runtime-config.service';

const TEST_DOMAIN = 'preview.example.test';

const minimalSiteConfig = (runtime?: Record<string, unknown>, domain = TEST_DOMAIN) => ({
    version: 1,
    domain,
    defaultPageId: 'default',
    routes: [
        { path: '/', pageId: 'default' },
        {
            path: '/account',
            pageId: 'account',
            auth: { required: true, redirectTo: '/login' },
        },
    ],
    ...(runtime ? { runtime } : {}),
    site: {
        appIdentity: {
            identifier: 'preview',
            name: 'Preview',
        },
        theme: {
            palettes: {
                light: {
                    bgColor: '#ffffff',
                    textColor: '#111111',
                    titleColor: '#111111',
                    linkColor: '#0d6efd',
                    accentColor: '#128c7e',
                    secondaryBgColor: '#f5f5f5',
                    secondaryTextColor: '#222222',
                    secondaryTitleColor: '#111111',
                    secondaryLinkColor: '#0d6efd',
                    secondaryAccentColor: '#25d366',
                    successColor: '#128c7e',
                    onSuccessColor: '#06110f',
                    errorColor: '#dc3545',
                    onErrorColor: '#3b0a10',
                    warningColor: '#f59e0b',
                    onWarningColor: '#3a2400',
                    infoColor: '#214c72',
                    onInfoColor: '#041b44',
                },
                dark: {
                    bgColor: '#11161d',
                    textColor: '#edf3f8',
                    titleColor: '#ffffff',
                    linkColor: '#6097b5',
                    accentColor: '#25d366',
                    secondaryBgColor: '#1d2630',
                    secondaryTextColor: '#c2ccd6',
                    secondaryTitleColor: '#f7fbff',
                    secondaryLinkColor: '#6097b5',
                    secondaryAccentColor: '#ff8c7a',
                    successColor: '#128c7e',
                    onSuccessColor: '#06110f',
                    errorColor: '#ff7b89',
                    onErrorColor: '#31070c',
                    warningColor: '#f7c948',
                    onWarningColor: '#2a1f00',
                    infoColor: '#6097b5',
                    onInfoColor: '#071b33',
                },
            },
        },
        i18n: { defaultLanguage: 'es', supportedLanguages: ['es'] },
    },
});

const publicAuth = {
    enabled: true,
    authProfileId: 'staff',
    provider: 'cognito',
    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
    clientId: 'public-web-client',
    hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
    scopes: ['openid', 'email', 'profile'],
    redirectPath: '/auth/callback',
    logoutPath: '/logout',
    loginPath: '/login',
    groupsClaim: 'cognito:groups',
    allowedGroups: ['Editors'],
};

describe('RuntimeConfigService remote auth', () => {
    let service: RuntimeConfigService;
    let store: ConfigStoreService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });

        service = TestBed.inject(RuntimeConfigService);
        store = TestBed.inject(ConfigStoreService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        TestBed.resetTestingModule();
    });

    it('does not request remote auth when the draft has no auth config', async () => {
        store.setSiteConfig(minimalSiteConfig());

        await expectAsync((service as any).resolveRemoteAuth(TEST_DOMAIN)).toBeResolvedTo(true);

        http.expectNone('/auth/runtime-config');
        expect(service.auth()).toBeNull();
    });

    it('requests remote auth with only domain and authProfileId and hydrates runtime auth', async () => {
        store.setSiteConfig(minimalSiteConfig({
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        }));

        const resolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        const request = http.expectOne('/auth/runtime-config');
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            domain: TEST_DOMAIN,
            authProfileId: 'staff',
        });
        expect(JSON.stringify(request.request.body)).not.toContain('credentialRef');
        expect(JSON.stringify(request.request.body)).not.toContain('access');
        expect(JSON.stringify(request.request.body)).not.toContain('clientSecret');
        request.flush({ ok: true, domain: TEST_DOMAIN, auth: publicAuth });

        await expectAsync(resolved).toBeResolvedTo(true);
        expect(service.auth()).toEqual(publicAuth as any);
        expect((store.siteConfig()?.runtime as Record<string, unknown>)['authRemote']).toBeUndefined();
    });

    it('rehydrates auth when the site config is reloaded with the same remote reference', async () => {
        const runtime = {
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        };
        store.setSiteConfig(minimalSiteConfig(runtime));

        const firstResolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        http.expectOne('/auth/runtime-config').flush({ ok: true, domain: TEST_DOMAIN, auth: publicAuth });
        await expectAsync(firstResolved).toBeResolvedTo(true);

        store.setSiteConfig(minimalSiteConfig(runtime));
        expect(service.auth()).toBeNull();

        const secondResolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        http.expectOne('/auth/runtime-config').flush({ ok: true, domain: TEST_DOMAIN, auth: publicAuth });
        await expectAsync(secondResolved).toBeResolvedTo(true);

        expect(service.auth()).toEqual(publicAuth as any);
        expect((store.siteConfig()?.runtime as Record<string, unknown>)['authRemote']).toBeUndefined();
    });

    it('rejects invalid remote auth metadata and keeps auth disabled', async () => {
        store.setSiteConfig(minimalSiteConfig({
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        }));

        const resolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        http.expectOne('/auth/runtime-config').flush({
            ok: true,
            auth: {
                ...publicAuth,
                clientSecret: 'raw-secret',
            },
        });

        await expectAsync(resolved).toBeResolvedTo(false);
        expect(service.auth()).toBeNull();
    });

    it('rejects remote auth metadata for a different auth profile', async () => {
        store.setSiteConfig(minimalSiteConfig({
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        }));

        const resolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        http.expectOne('/auth/runtime-config').flush({
            ok: true,
            auth: {
                ...publicAuth,
                authProfileId: 'admins',
            },
        });

        await expectAsync(resolved).toBeResolvedTo(false);
        expect(service.auth()).toBeNull();
    });

    it('does not install a stale remote auth response into a different site config', async () => {
        store.setSiteConfig(minimalSiteConfig({
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        }));

        const resolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        store.setSiteConfig(minimalSiteConfig({
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        }, 'other.example.test'));

        http.expectOne('/auth/runtime-config').flush({ ok: true, domain: TEST_DOMAIN, auth: publicAuth });

        await expectAsync(resolved).toBeResolvedTo(false);
        expect(store.siteConfig()?.domain).toBe('other.example.test');
        expect(service.auth()).toBeNull();
    });

    it('fails closed when the remote auth request fails', async () => {
        store.setSiteConfig(minimalSiteConfig({
            authRemote: {
                enabled: true,
                authProfileId: 'staff',
                endpoint: '/auth/runtime-config',
            },
        }));

        const resolved = (service as any).resolveRemoteAuth(TEST_DOMAIN);
        http.expectOne('/auth/runtime-config').flush({ ok: false, error: 'unavailable' }, {
            status: 502,
            statusText: 'Bad Gateway',
        });

        await expectAsync(resolved).toBeResolvedTo(false);
        expect(service.auth()).toBeNull();
    });
});
