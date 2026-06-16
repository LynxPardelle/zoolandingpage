import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfigStoreService } from '../../shared/services/config-store.service';
import { AuthFacade } from './auth.facade';
import { AuthOidcService } from './auth-oidc.service';
import { AuthRuntimeService } from './auth-runtime.service';
import { AuthSessionBrowserStorageService } from './auth-session-browser-storage.service';

const base64UrlJson = (value: unknown): string => {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
};

const fakeJwt = (claims: Readonly<Record<string, unknown>>): string =>
    `${ base64UrlJson({ alg: 'none', typ: 'JWT' }) }.${ base64UrlJson(claims) }.signature`;

describe('auth signal state', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        sessionStorage.clear();
    });

    it('starts anonymous and keeps token material out of state', () => {
        TestBed.configureTestingModule({});
        const auth = TestBed.inject(AuthFacade);
        const state = auth.snapshot();

        expect(auth.status()).toBe('anonymous');
        expect(auth.isAuthenticated()).toBeFalse();
        expect(auth.hasAnyGroup(['owner'])).toBeFalse();
        expect(Object.keys(state).join('|')).not.toContain('token');
        expect(Object.keys(state).join('|')).not.toContain('secret');
    });

    it('stores a public auth profile when a session is established', () => {
        TestBed.configureTestingModule({});
        const auth = TestBed.inject(AuthFacade);

        auth.establishSession({
            profile: {
                subject: 'user-123',
                displayName: 'Alec',
                email: 'alec@example.com',
                roles: ['owner'],
            },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        });
        const state = auth.snapshot();

        expect(auth.status()).toBe('authenticated');
        expect(auth.isAuthenticated()).toBeTrue();
        expect(auth.profile()).toEqual({
            subject: 'user-123',
            displayName: 'Alec',
            email: 'alec@example.com',
            roles: ['owner'],
        });
        expect((state as Record<string, unknown>)['accessToken']).toBeUndefined();
        expect((state as Record<string, unknown>)['idToken']).toBeUndefined();
        expect((state as Record<string, unknown>)['clientSecret']).toBeUndefined();
    });

    it('marks sign-in as authenticating without creating token state', () => {
        TestBed.configureTestingModule({});
        const auth = TestBed.inject(AuthFacade);

        auth.requestSignIn('cognito');

        expect(auth.status()).toBe('authenticating');
        expect(auth.snapshot().provider).toBe('cognito');
        expect((auth.snapshot() as Record<string, unknown>)['accessToken']).toBeUndefined();
    });

    it('persists only minimal non-secret session metadata in browser storage', () => {
        TestBed.configureTestingModule({});
        const storage = TestBed.inject(AuthSessionBrowserStorageService);

        storage.writeSession({
            profile: {
                subject: 'user-123',
                displayName: 'Alec',
                email: 'alec@example.com',
                roles: ['owner'],
                accessToken: 'access-token-value',
                refreshToken: 'refresh-token-value',
                clientSecret: 'client-secret-value',
                idToken: 'id-token-value',
            } as never,
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        });

        const raw = sessionStorage.getItem('zlp.auth.publicSession.v1') ?? '';
        expect(raw).not.toContain('Alec');
        expect(raw).not.toContain('alec@example.com');
        expect(raw).not.toContain('token-value');
        expect(raw).not.toContain('secret-value');

        expect(storage.readSession()).toEqual({
            profile: {
                subject: 'user-123',
                roles: ['owner'],
            },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        });
    });

    it('does not touch browser storage on the server platform', () => {
        TestBed.configureTestingModule({
            providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
        });
        const storage = TestBed.inject(AuthSessionBrowserStorageService);

        expect(storage.readSession()).toBeNull();
        expect(() => storage.writeSession({
            profile: { subject: 'user-123' },
            provider: 'future-cognito',
            expiresAtEpochMs: 1780000000000,
        })).not.toThrow();
    });

    it('exposes disabled optional draft auth by default', () => {
        TestBed.configureTestingModule({});
        const authRuntime = TestBed.inject(AuthRuntimeService);

        expect(authRuntime.isEnabled()).toBeFalse();
        expect(authRuntime.profile()).toBeNull();
        expect(authRuntime.evaluateRouteAccess(null)).toEqual({
            allowed: true,
            reason: 'public-route',
            redirectTo: null,
            requiredGroups: [],
        });
    });

    it('evaluates Cognito route access from public draft config and public user groups', () => {
        TestBed.configureTestingModule({});
        const store = TestBed.inject(ConfigStoreService);
        const auth = TestBed.inject(AuthFacade);
        const authRuntime = TestBed.inject(AuthRuntimeService);

        store.setSiteConfig({
            version: 1,
            domain: 'preview.example.test',
            routes: [
                { path: '/', pageId: 'home' },
                {
                    path: '/mi-cuenta',
                    pageId: 'account',
                    auth: {
                        required: true,
                        allowedGroups: ['client-admin'],
                        redirectTo: '/acceso',
                    },
                },
            ],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'preview-client-cognito',
                    provider: 'cognito' as const,
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
                    userPoolId: 'us-east-1_PREVIEW',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid', 'email', 'profile'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                    loginPageId: 'acceso',
                    callbackPageId: 'auth-callback',
                    accountPageId: 'mi-cuenta',
                    groupsClaim: 'cognito:groups',
                },
            },
            site: {
                appIdentity: { identifier: 'preview', name: 'Preview' },
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

        expect(authRuntime.isEnabled()).toBeTrue();
        expect(authRuntime.profile()?.authProfileId).toBe('preview-client-cognito');
        expect(authRuntime.evaluateRouteAccess(store.siteConfig()?.routes[1] ?? null)).toEqual({
            allowed: false,
            reason: 'auth-required',
            redirectTo: '/acceso',
            requiredGroups: ['client-admin'],
        });

        auth.establishSession({
            profile: { subject: 'user-123', roles: ['client-admin'] },
            provider: 'cognito',
            expiresAtEpochMs: 1780000000000,
        });

        expect(auth.hasAnyGroup(['client-admin'])).toBeTrue();
        expect(authRuntime.evaluateRouteAccess(store.siteConfig()?.routes[1] ?? null)).toEqual({
            allowed: true,
            reason: 'authenticated',
            redirectTo: null,
            requiredGroups: ['client-admin'],
        });
    });

    it('uses loginPath for protected-route redirects and never falls back to logoutPath', () => {
        TestBed.configureTestingModule({});
        const store = TestBed.inject(ConfigStoreService);
        const authRuntime = TestBed.inject(AuthRuntimeService);
        const baseConfig = {
            version: 1,
            domain: 'preview.example.test',
            routes: [
                { path: '/', pageId: 'home' },
                {
                    path: '/mi-cuenta',
                    pageId: 'account',
                    auth: {
                        required: true,
                    },
                },
            ],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'preview-client-cognito',
                    provider: 'cognito' as const,
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/salir',
                    loginPath: '/acceso',
                },
            },
            site: {
                appIdentity: { identifier: 'preview', name: 'Preview' },
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
        };

        store.setSiteConfig(baseConfig);
        expect(authRuntime.evaluateRouteAccess(store.siteConfig()?.routes[1] ?? null).redirectTo).toBe('/acceso');

        store.setSiteConfig({
            ...baseConfig,
            runtime: {
                auth: {
                    ...baseConfig.runtime.auth,
                    loginPath: undefined,
                },
            },
        });
        expect(authRuntime.evaluateRouteAccess(store.siteConfig()?.routes[1] ?? null).redirectTo).toBeNull();
    });

    it('generates Cognito Hosted UI login URLs with caller-provided PKCE challenge and parses callbacks', () => {
        TestBed.configureTestingModule({});
        const oidc = TestBed.inject(AuthOidcService);

        const loginUrl = oidc.buildLoginUrl({
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito',
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
            loginPath: '/acceso',
        }, {
            origin: 'https://preview.example.test',
            state: 'state-123',
            codeChallenge: 'pkce-challenge-abc',
        });

        expect(loginUrl).toBe('https://preview.auth.us-east-1.amazoncognito.com/oauth2/authorize?client_id=public-web-client&response_type=code&redirect_uri=https%3A%2F%2Fpreview.example.test%2Fauth%2Fcallback&scope=openid+email&state=state-123&code_challenge=pkce-challenge-abc&code_challenge_method=S256');
        expect(oidc.buildSignupUrl({
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito',
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
            loginPath: '/acceso',
        }, {
            origin: 'https://preview.example.test',
            state: 'state-123',
            codeChallenge: 'pkce-challenge-abc',
        })).toBe('https://preview.auth.us-east-1.amazoncognito.com/signup?client_id=public-web-client&response_type=code&redirect_uri=https%3A%2F%2Fpreview.example.test%2Fauth%2Fcallback&scope=openid+email&state=state-123&code_challenge=pkce-challenge-abc&code_challenge_method=S256');
        expect(oidc.buildForgotPasswordUrl({
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito',
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
            loginPath: '/acceso',
        }, {
            origin: 'https://preview.example.test',
            state: 'state-123',
            codeChallenge: 'pkce-challenge-abc',
        })).toBe('https://preview.auth.us-east-1.amazoncognito.com/forgotPassword?client_id=public-web-client&response_type=code&redirect_uri=https%3A%2F%2Fpreview.example.test%2Fauth%2Fcallback&scope=openid+email&state=state-123&code_challenge=pkce-challenge-abc&code_challenge_method=S256');
        expect(oidc.buildLogoutUrl({
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito',
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
            loginPath: '/acceso',
        }, {
            origin: 'https://preview.example.test',
        })).toBe('https://preview.auth.us-east-1.amazoncognito.com/logout?client_id=public-web-client&logout_uri=https%3A%2F%2Fpreview.example.test%2Facceso');
        expect(oidc.parseCallbackUrl('https://preview.example.test/auth/callback?code=abc&state=state-123')).toEqual({
            code: 'abc',
            state: 'state-123',
            error: null,
            errorDescription: null,
        });
    });

    it('preserves same-origin preview query params in Cognito redirect and logout URLs', () => {
        TestBed.configureTestingModule({});
        const oidc = TestBed.inject(AuthOidcService);
        const profile = {
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito' as const,
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
            loginPath: '/acceso',
        };

        const loginUrl = oidc.buildLoginUrl(profile, {
            origin: 'https://test.zoolandingpage.com.mx',
            redirectUri: 'https://test.zoolandingpage.com.mx/auth/callback?draftDomain=zoositioweb.com.mx&debugWorkspace=false',
            state: 'state-123',
            codeChallenge: 'pkce-challenge-abc',
        });
        const logoutUrl = oidc.buildLogoutUrl(profile, {
            origin: 'https://test.zoolandingpage.com.mx',
            logoutUri: 'https://test.zoolandingpage.com.mx/acceso?draftDomain=zoositioweb.com.mx&debugWorkspace=false',
        });

        expect(loginUrl).toContain('redirect_uri=https%3A%2F%2Ftest.zoolandingpage.com.mx%2Fauth%2Fcallback%3FdraftDomain%3Dzoositioweb.com.mx%26debugWorkspace%3Dfalse');
        expect(logoutUrl).toBe('https://preview.auth.us-east-1.amazoncognito.com/logout?client_id=public-web-client&logout_uri=https%3A%2F%2Ftest.zoolandingpage.com.mx%2Facceso%3FdraftDomain%3Dzoositioweb.com.mx%26debugWorkspace%3Dfalse');
    });

    it('refuses to generate Cognito login URLs from unsafe public auth config', () => {
        TestBed.configureTestingModule({});
        const oidc = TestBed.inject(AuthOidcService);
        const profile = {
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito' as const,
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
        };
        const options = {
            origin: 'https://preview.example.test',
            state: 'state-123',
            codeChallenge: 'pkce-challenge-abc',
        };

        expect(oidc.buildLoginUrl({ ...profile, hostedUiDomain: 'http://preview.auth.us-east-1.amazoncognito.com' }, options)).toBeNull();
        expect(oidc.buildLoginUrl({ ...profile, hostedUiDomain: '//evil.example' }, options)).toBeNull();
        expect(oidc.buildLoginUrl({ ...profile, issuer: 'http://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW' }, options)).toBeNull();
        expect(oidc.buildLoginUrl({ ...profile, redirectPath: 'https://evil.example/callback' }, options)).toBeNull();
        expect(oidc.buildLoginUrl({ ...profile, redirectPath: '//evil.example/callback' }, options)).toBeNull();
        expect(oidc.buildLoginUrl({ ...profile, redirectPath: '/auth/call back' }, options)).toBeNull();
    });

    it('exchanges Cognito authorization codes for validated public claims without returning token material', async () => {
        TestBed.configureTestingModule({});
        const oidc = TestBed.inject(AuthOidcService);
        const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + 3600;
        const idToken = fakeJwt({
            iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            aud: 'public-web-client',
            exp: expiresAtEpochSeconds,
            sub: 'user-123',
            email: 'user@example.test',
            'cognito:groups': ['client-admin'],
        });
        const fetchSpy = jasmine.createSpy('fetch').and.resolveTo(new Response(JSON.stringify({
            id_token: idToken,
            access_token: 'raw-access-token',
            refresh_token: 'raw-refresh-token',
            token_type: 'Bearer',
            expires_in: 3600,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        const result = await oidc.exchangeAuthorizationCode({
            enabled: true,
            authProfileId: 'preview-client-cognito',
            provider: 'cognito',
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
            clientId: 'public-web-client',
            hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
        }, {
            origin: 'https://preview.example.test',
            redirectUri: 'https://preview.example.test/auth/callback?draftDomain=zoositioweb.com.mx',
            code: 'auth-code',
            codeVerifier: 'pkce-verifier',
            fetchImpl: fetchSpy,
        });

        expect(result?.claims['sub']).toBe('user-123');
        expect(result?.expiresAtEpochMs).toBe(expiresAtEpochSeconds * 1000);
        expect(Object.keys(result ?? {}).join('|')).not.toContain('token');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [requestUrl, requestInit] = fetchSpy.calls.argsFor(0);
        expect(String(requestUrl)).toBe('https://preview.auth.us-east-1.amazoncognito.com/oauth2/token');
        expect(String(requestInit?.body)).toContain('grant_type=authorization_code');
        expect(String(requestInit?.body)).toContain('client_id=public-web-client');
        expect(String(requestInit?.body)).toContain('redirect_uri=https%3A%2F%2Fpreview.example.test%2Fauth%2Fcallback%3FdraftDomain%3Dzoositioweb.com.mx');
        expect(String(requestInit?.body)).toContain('code_verifier=pkce-verifier');
        expect(String(requestInit?.body)).not.toContain('secret');
    });
});
