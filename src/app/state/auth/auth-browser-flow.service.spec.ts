import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthBrowserFlowService } from './auth-browser-flow.service';
import { AuthFacade } from './auth.facade';
import { AuthOidcService, type TAuthCallbackResult, type TAuthTokenExchangeResult } from './auth-oidc.service';

const AUTH_PKCE_STORAGE_KEY = 'zlp.auth.pkceTransaction.v1';

describe('AuthBrowserFlowService', () => {
    let oidc: jasmine.SpyObj<AuthOidcService>;

    beforeEach(() => {
        sessionStorage.clear();
        oidc = jasmine.createSpyObj<AuthOidcService>('AuthOidcService', [
            'parseCallbackUrl',
            'exchangeAuthorizationCode',
            'buildLoginUrl',
            'buildSignupUrl',
            'buildForgotPasswordUrl',
            'buildLogoutUrl',
        ]);

        TestBed.configureTestingModule({
            providers: [
                { provide: PLATFORM_ID, useValue: 'browser' },
                { provide: AuthOidcService, useValue: oidc },
            ],
        });

        TestBed.inject(ConfigStoreService).setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [
                { path: '/', pageId: 'default' },
                { path: '/acceso', pageId: 'acceso' },
                {
                    path: '/mi-cuenta',
                    pageId: 'mi-cuenta',
                    auth: {
                        required: true,
                        redirectTo: '/acceso',
                        allowedGroups: ['zoosite-client'],
                    },
                },
            ],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Pq5OCadbK',
                    userPoolId: 'us-east-1_Pq5OCadbK',
                    hostedUiDomain: 'https://zoosite-staff-planned.auth.us-east-1.amazoncognito.com',
                    clientId: '16jb6ml9q5jdh6blj7f668fajp',
                    scopes: ['openid', 'email', 'profile'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                    groupsClaim: 'cognito:groups',
                    allowedGroups: ['zoosite-client', 'zoosite-admin'],
                },
            },
            site: {
                appIdentity: { identifier: 'zoosite', name: 'Zoosite' },
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
    });

    afterEach(() => {
        sessionStorage.clear();
        TestBed.resetTestingModule();
    });

    it('completes a Cognito callback into public session metadata and a protected-route redirect', async () => {
        const expiresAtEpochMs = Date.now() + 3600_000;
        const callback: TAuthCallbackResult = {
            code: 'auth-code',
            state: 'state-123',
            error: null,
            errorDescription: null,
        };
        const exchange: TAuthTokenExchangeResult = {
            expiresAtEpochMs,
            claims: {
                sub: 'user-123',
                email: 'user@example.test',
                name: 'User Test',
                'cognito:groups': ['zoosite-client'],
            },
        };
        sessionStorage.setItem(AUTH_PKCE_STORAGE_KEY, JSON.stringify({
            version: 1,
            action: 'login',
            authProfileId: 'staff',
            state: 'state-123',
            codeVerifier: 'pkce-verifier',
            redirectUri: `${ window.location.origin }/auth/callback`,
            createdAtEpochMs: Date.now(),
        }));
        oidc.parseCallbackUrl.and.returnValue(callback);
        oidc.exchangeAuthorizationCode.and.resolveTo(exchange);

        const service = TestBed.inject(AuthBrowserFlowService);
        const auth = TestBed.inject(AuthFacade);
        const result = await service.completeCallbackFromUrl(`${ window.location.origin }/auth/callback?code=auth-code&state=state-123`);

        expect(result).toEqual({
            handled: true,
            redirectTo: '/mi-cuenta',
            reason: 'authenticated',
        });
        expect(auth.isAuthenticated()).toBeTrue();
        expect(auth.profile()).toEqual({
            subject: 'user-123',
            displayName: 'User Test',
            email: 'user@example.test',
            roles: ['zoosite-client'],
        });
        expect(sessionStorage.getItem(AUTH_PKCE_STORAGE_KEY)).toBeNull();
        expect(sessionStorage.getItem('zlp.auth.publicSession.v1') ?? '').not.toContain('token');
        expect(oidc.exchangeAuthorizationCode).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            authProfileId: 'staff',
        }), jasmine.objectContaining({
            code: 'auth-code',
            codeVerifier: 'pkce-verifier',
            redirectUri: `${ window.location.origin }/auth/callback`,
        }));
    });

    it('preserves shared test preview query params in Cognito redirect URI transactions', async () => {
        window.history.pushState({}, '', '/acceso?draftDomain=zoositioweb.com.mx&debugWorkspace=false');
        oidc.buildLoginUrl.and.returnValue('https://zoosite-staff-planned.auth.us-east-1.amazoncognito.com/oauth2/authorize');

        const service = TestBed.inject(AuthBrowserFlowService);
        const url = await service.createInteractiveUrl('login');
        const transaction = JSON.parse(sessionStorage.getItem(AUTH_PKCE_STORAGE_KEY) ?? '{}') as { redirectUri?: string };

        expect(url).toBe('https://zoosite-staff-planned.auth.us-east-1.amazoncognito.com/oauth2/authorize');
        expect(transaction.redirectUri).toBe(`${ window.location.origin }/auth/callback?draftDomain=zoositioweb.com.mx&debugWorkspace=false`);
        expect(oidc.buildLoginUrl).toHaveBeenCalledOnceWith(jasmine.objectContaining({
            authProfileId: 'staff',
        }), jasmine.objectContaining({
            redirectUri: `${ window.location.origin }/auth/callback?draftDomain=zoositioweb.com.mx&debugWorkspace=false`,
        }));
    });

    it('fails closed when callback state does not match the PKCE transaction', async () => {
        sessionStorage.setItem(AUTH_PKCE_STORAGE_KEY, JSON.stringify({
            version: 1,
            action: 'login',
            authProfileId: 'staff',
            state: 'expected-state',
            codeVerifier: 'pkce-verifier',
            redirectUri: `${ window.location.origin }/auth/callback`,
            createdAtEpochMs: Date.now(),
        }));
        oidc.parseCallbackUrl.and.returnValue({
            code: 'auth-code',
            state: 'wrong-state',
            error: null,
            errorDescription: null,
        });

        const service = TestBed.inject(AuthBrowserFlowService);
        const auth = TestBed.inject(AuthFacade);
        const result = await service.completeCallbackFromUrl(`${ window.location.origin }/auth/callback?code=auth-code&state=wrong-state`);

        expect(result.reason).toBe('state-mismatch');
        expect(auth.isAuthenticated()).toBeFalse();
        expect(oidc.exchangeAuthorizationCode).not.toHaveBeenCalled();
        expect(sessionStorage.getItem(AUTH_PKCE_STORAGE_KEY)).toBeNull();
    });
});
