import type { TComponentPayloadEntry, TComponentsPayload } from '../../types/config-payloads.types';
import {
    isAnalyticsConfigPayload,
    isAngoraCombosPayload,
    isAuthoringDraftPackage,
    isComponentsPayload,
    isDraftSiteConfigPayload,
    isI18nPayload,
    isPageConfigPayload,
    isRuntimeBundlePayload,
    isSeoPayload,
    isStructuredDataPayload,
    isVariablesPayload,
} from './config-payload.validators';

const TEST_DOMAIN = 'preview.example.test';

const createComponentsPayload = (
    components: Record<string, TComponentPayloadEntry>,
    domain = 'zoolandingpage.com.mx',
    pageId = 'default',
): TComponentsPayload => ({
    version: 1,
    pageId,
    domain,
    components: Object.values(components) as TComponentPayloadEntry[],
});

const minimalSiteConfig = () => ({
    appIdentity: {
        identifier: 'pokeapi-demo',
        name: 'PokeAPI Demo',
    },
    theme: {
        palettes: {
            light: {
                bgColor: '#ffffff',
                textColor: '#111111',
                titleColor: '#111111',
                linkColor: '#0d6efd',
                accentColor: '#f4c430',
                secondaryBgColor: '#f7f7f7',
                secondaryTextColor: '#222222',
                secondaryTitleColor: '#111111',
                secondaryLinkColor: '#0d6efd',
                secondaryAccentColor: '#2e8b57',
                successColor: '#2e8b57',
                onSuccessColor: '#ffffff',
                errorColor: '#d7462f',
                onErrorColor: '#ffffff',
                warningColor: '#f4c430',
                onWarningColor: '#111111',
                infoColor: '#2864a8',
                onInfoColor: '#ffffff',
            },
            dark: {
                bgColor: '#10131a',
                textColor: '#f7f7f7',
                titleColor: '#ffffff',
                linkColor: '#9fd3ff',
                accentColor: '#f4c430',
                secondaryBgColor: '#171b24',
                secondaryTextColor: '#e7e7e7',
                secondaryTitleColor: '#ffffff',
                secondaryLinkColor: '#9fd3ff',
                secondaryAccentColor: '#8ee6a8',
                successColor: '#8ee6a8',
                onSuccessColor: '#10131a',
                errorColor: '#ff8a7a',
                onErrorColor: '#10131a',
                warningColor: '#f4c430',
                onWarningColor: '#10131a',
                infoColor: '#9fd3ff',
                onInfoColor: '#10131a',
            },
        },
    },
    i18n: {
        defaultLanguage: 'es',
        supportedLanguages: ['es'],
    },
});

describe('config-payload.validators', () => {
    it('validates page-config payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            rootIds: ['landingPage'],
        };
        const invalid = { pageId: 'default' };

        expect(isPageConfigPayload(valid)).toBeTrue();
        expect(isPageConfigPayload(invalid)).toBeFalse();
    });

    it('validates site-config payloads with required site metadata', () => {
        const valid = {
            version: 1,
            domain: 'zoolandingpage.com.mx',
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                appIdentity: {
                    identifier: 'zoolandingpagecommx',
                    name: 'Zoo Landing Page',
                },
                theme: {
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#222222',
                            linkColor: '#333333',
                            accentColor: '#444444',
                            secondaryBgColor: '#f5f5f5',
                            secondaryTextColor: '#555555',
                            secondaryTitleColor: '#666666',
                            secondaryLinkColor: '#777777',
                            secondaryAccentColor: '#888888',
                            successColor: '#198754',
                            onSuccessColor: '#052e1c',
                            errorColor: '#dc3545',
                            onErrorColor: '#3b0a10',
                            warningColor: '#f59e0b',
                            onWarningColor: '#3a2400',
                            infoColor: '#0d6efd',
                            onInfoColor: '#041b44',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                },
                icons: {
                    favicon: '/assets/brand/zoolandingpage-default-favicon.svg',
                    appleTouchIcon: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/brand/apple-touch-icon.png',
                    maskIcon: 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/brand/mask-icon.svg',
                    themeColor: '#128c7e',
                },
                i18n: {
                    defaultLanguage: 'es',
                    supportedLanguages: ['es', 'en'],
                },
            },
            defaults: {
                ui: {
                    toast: {
                        hostClasses: 'toast-host',
                    },
                },
            },
        };

        expect(isDraftSiteConfigPayload(valid)).toBeTrue();
    });

    it('rejects invalid site browser icon configuration', () => {
        const invalid = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                ...minimalSiteConfig(),
                icons: {
                    favicon: 123,
                },
            },
        };

        expect(isDraftSiteConfigPayload(invalid)).toBeFalse();
    });

    it('accepts configurable draft not-found page ids in site-config payloads', () => {
        const valid = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            notFoundPageId: 'not-found',
            routes: [
                { path: '/', pageId: 'default' },
                { path: '/404', pageId: 'not-found' },
            ],
            site: minimalSiteConfig(),
        };
        const invalid = {
            ...valid,
            notFoundPageId: 404,
        };

        expect(isDraftSiteConfigPayload(valid)).toBeTrue();
        expect(isDraftSiteConfigPayload(invalid)).toBeFalse();
    });

    it('accepts draft Google tag and Search Console runtime configuration', () => {
        const valid = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                ...minimalSiteConfig(),
                searchConsole: {
                    googleSiteVerification: 'verification-token',
                    htmlFile: {
                        path: '/googleabc123.html',
                        content: 'google-site-verification: googleabc123.html',
                    },
                    environments: { local: true, test: true, production: false },
                },
                hostOverrides: {
                    'alias.example.test': {
                        seo: {
                            canonicalOrigin: 'https://alias.example.test',
                            enforceCanonicalHost: true,
                            forceHttps: true,
                        },
                        googleTag: {
                            enabled: true,
                            environments: { local: false, test: true, production: true },
                            measurementIds: ['G-ALIAS123'],
                            adsIds: ['AW-ALIAS123'],
                            sendPageView: false,
                        },
                        searchConsole: {
                            googleSiteVerification: 'alias-verification-token',
                            htmlFile: {
                                path: '/googlealias123.html',
                                content: 'google-site-verification: googlealias123.html',
                            },
                            environments: { test: true, production: true },
                        },
                    },
                },
            },
            environments: {
                test: {
                    aliases: ['test.alias.example.test'],
                },
            },
            runtime: {
                analytics: {
                    enabled: true,
                    consentUI: 'none',
                    googleTag: {
                        enabled: true,
                        environments: { local: true, test: true, production: true },
                        measurementIds: ['G-TEST123'],
                        adsIds: ['AW-TEST123'],
                        gtmId: 'GTM-TEST123',
                        attribution: { storage: 'session', ttlDays: 7 },
                        events: {
                            whatsapp_click: {
                                name: 'lead_conversion_whatsapp',
                                params: { pyme_id: 'fixture-pyme' },
                            },
                        },
                        conversions: {
                            whatsapp_click: {
                                sendTo: 'AW-TEST123/whatsappLabel',
                                value: 1,
                                currency: 'MXN',
                            },
                        },
                    },
                },
            },
        };

        const invalid = {
            ...valid,
            runtime: {
                analytics: {
                    googleTag: {
                        enabled: true,
                        measurementIds: ['UA-OLD'],
                    },
                },
            },
        };

        expect(isDraftSiteConfigPayload(valid)).toBeTrue();
        expect(isDraftSiteConfigPayload(invalid)).toBeFalse();
    });

    it('rejects invalid draft host override and environment alias configuration', () => {
        const valid = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload({
            ...valid,
            site: {
                ...minimalSiteConfig(),
                hostOverrides: {
                    'bad:host.example.test': {
                        seo: { canonicalOrigin: 'https://alias.example.test' },
                    },
                },
            },
        })).toBeFalse();
        expect(isDraftSiteConfigPayload({
            ...valid,
            environments: {
                qa: { aliases: ['qa.example.test'] },
            },
        })).toBeFalse();
    });

    it('accepts runtime data sources and api actions in site-config payloads', () => {
        const valid = {
            version: 1,
            domain: 'music.lynxpardelle.com',
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                appIdentity: {
                    identifier: 'musiclynxpardellecom',
                    name: 'Lynx Pardelle',
                },
                theme: {
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#222222',
                            linkColor: '#333333',
                            accentColor: '#444444',
                            secondaryBgColor: '#f5f5f5',
                            secondaryTextColor: '#555555',
                            secondaryTitleColor: '#666666',
                            secondaryLinkColor: '#777777',
                            secondaryAccentColor: '#888888',
                            successColor: '#198754',
                            onSuccessColor: '#052e1c',
                            errorColor: '#dc3545',
                            onErrorColor: '#3b0a10',
                            warningColor: '#f59e0b',
                            onWarningColor: '#3a2400',
                            infoColor: '#0d6efd',
                            onInfoColor: '#041b44',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                },
                i18n: {
                    defaultLanguage: 'es',
                    supportedLanguages: ['es', 'en'],
                },
            },
            runtime: {
                navigation: {
                    scrollRestoration: {
                        mode: 'top',
                        behavior: 'auto',
                    },
                },
                dataSources: [
                    {
                        id: 'pokemon-list',
                        proxySourceId: 'pokemonList',
                        target: 'remote.music.apiDemo.pokemon',
                        statusTarget: 'remoteStatus.music.apiDemo.pokemon',
                        input: { limit: 6 },
                        mapper: {
                            itemsPath: 'results',
                            fields: {
                                title: 'name',
                                href: 'url',
                                description: {
                                    path: 'url',
                                    fallback: 'PokeAPI resource',
                                },
                            },
                        },
                        refresh: {
                            mode: 'interval',
                            intervalMs: 300000,
                        },
                    },
                ],
                apiActions: [
                    {
                        id: 'newsletter-signup',
                        proxyActionId: 'mailingListSubscribe',
                        method: 'POST',
                        statusTarget: 'remoteStatus.newsletterSignup',
                        inputFields: ['email', 'language'],
                        requiresUserGesture: true,
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(valid)).toBeTrue();
    });

    it('rejects server-only access policy in public runtime data sources and api actions', () => {
        const base = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                dataSources: [
                    {
                        id: 'protected-posts',
                        proxySourceId: 'protectedBlogPosts',
                        target: 'remote.blog.posts',
                        access: {
                            required: true,
                            authProfileId: 'staff',
                        },
                    },
                ],
            },
        })).toBeFalse();
        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                apiActions: [
                    {
                        id: 'create-post',
                        proxyActionId: 'createPost',
                        method: 'POST',
                        inputFields: ['title'],
                        auth: {
                            type: 'bearer',
                            token: 'raw-token',
                        },
                    },
                ],
            },
        })).toBeFalse();
    });

    it('accepts optional public remote auth runtime references', () => {
        const payload = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            runtime: {
                authRemote: {
                    enabled: true,
                    authProfileId: 'staff',
                    endpoint: '/auth/runtime-config',
                },
            },
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload(payload)).toBeTrue();
    });

    it('accepts safe auth session and admin endpoint paths in public runtime auth', () => {
        const payload = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
                    hostedUiDomain: 'https://example.auth.us-east-1.amazoncognito.com',
                    clientId: 'public-client-id',
                    scopes: ['openid', 'email'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    session: {
                        mode: 'server-cookie',
                        signinPath: '/auth/session/signin',
                        mePath: '/auth/session/me',
                        logoutPath: '/auth/session/logout',
                        challengeRespondPath: '/auth/session/challenge/respond',
                        mfaSetupPath: '/auth/session/mfa/setup',
                        mfaVerifyPath: '/auth/session/mfa/verify',
                        mfaEnrollStartPath: '/auth/session/mfa/enroll/start',
                        mfaEnrollVerifyPath: '/auth/session/mfa/enroll/verify',
                        mfaDisablePath: '/auth/session/mfa/disable',
                        csrfCookieName: 'zlp_csrf',
                        challengeCsrfCookieName: 'zlp_challenge_csrf',
                        mfaEnrollCsrfCookieName: 'zlp_mfa_enroll_csrf',
                        csrfHeaderName: 'X-ZLP-CSRF',
                        routeAccessCacheMs: 15000,
                    },
                    admin: {
                        usersPath: '/auth/admin/users',
                        approveUserPathTemplate: '/auth/admin/users/{subject}/approve',
                        groupsPathTemplate: '/auth/admin/users/{subject}/groups',
                        suspendUserPathTemplate: '/auth/admin/users/{subject}/suspend',
                        reactivateUserPathTemplate: '/auth/admin/users/{subject}/reactivate',
                        resetUserMfaPathTemplate: '/auth/admin/users/{subject}/mfa/reset',
                    },
                },
            },
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload(payload)).toBeTrue();
    });

    it('rejects unsafe auth session and admin endpoint paths', () => {
        const baseAuth = {
            enabled: true,
            authProfileId: 'staff',
            provider: 'cognito',
            issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
            hostedUiDomain: 'https://example.auth.us-east-1.amazoncognito.com',
            clientId: 'public-client-id',
            scopes: ['openid', 'email'],
            redirectPath: '/auth/callback',
            logoutPath: '/acceso',
        };
        const base = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                auth: {
                    ...baseAuth,
                    session: {
                        mode: 'server-cookie',
                        signinPath: 'https://evil.example/auth/session/signin',
                    },
                },
            },
        })).toBeFalse();
        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                auth: {
                    ...baseAuth,
                    session: {
                        mode: 'server-cookie',
                        routeAccessCacheMs: 120000,
                    },
                },
            },
        })).toBeFalse();
        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                auth: {
                    ...baseAuth,
                    session: {
                        mode: 'server-cookie',
                        challengeRespondPath: 'javascript:alert(1)',
                    },
                },
            },
        })).toBeFalse();
        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                auth: {
                    ...baseAuth,
                    admin: {
                        usersPath: '/auth/admin/users',
                        approveUserPathTemplate: '//evil.example/approve',
                    },
                },
            },
        })).toBeFalse();
    });

    it('rejects ambiguous static and remote auth runtime configuration', () => {
        const payload = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_PREVIEW',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://preview.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid', 'email', 'profile'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/logout',
                },
                authRemote: {
                    enabled: true,
                    authProfileId: 'staff',
                    endpoint: '/auth/runtime-config',
                },
            },
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload(payload)).toBeFalse();
    });

    it('rejects server-only policy or credential fields in public auth runtime config', () => {
        const base = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
        };
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
        };

        for (const unsafeAuthField of ['access', 'auth', 'credentialRef', 'clientSecret', 'accessToken', 'refreshToken']) {
            expect(isDraftSiteConfigPayload({
                ...base,
                runtime: {
                    auth: {
                        ...publicAuth,
                        [unsafeAuthField]: unsafeAuthField,
                    },
                },
            })).withContext(`runtime.auth.${ unsafeAuthField }`).toBeFalse();
        }

        for (const unsafeRemoteField of ['access', 'auth', 'credentialRef', 'clientSecret', 'accessToken', 'refreshToken']) {
            expect(isDraftSiteConfigPayload({
                ...base,
                runtime: {
                    authRemote: {
                        enabled: true,
                        authProfileId: 'staff',
                        endpoint: '/auth/runtime-config',
                        [unsafeRemoteField]: unsafeRemoteField,
                    },
                },
            })).withContext(`runtime.authRemote.${ unsafeRemoteField }`).toBeFalse();
        }
    });

    it('accepts server-only auth registry and integrations in authoring draft packages', () => {
        const draftPackage = {
            version: 1,
            domain: TEST_DOMAIN,
            stage: 'draft',
            files: [
                {
                    path: `${ TEST_DOMAIN }/site-config.json`,
                    kind: 'site-config',
                    content: {
                        version: 1,
                        domain: TEST_DOMAIN,
                        routes: [{ path: '/', pageId: 'default' }],
                        site: minimalSiteConfig(),
                    },
                },
                {
                    path: `${ TEST_DOMAIN }/server/auth-profile-registry.json`,
                    kind: 'server-auth-profile-registry',
                    content: {
                        version: 1,
                        profiles: [],
                    },
                },
                {
                    path: `${ TEST_DOMAIN }/server/integrations.json`,
                    kind: 'server-integrations',
                    content: {
                        version: 1,
                        sources: [],
                        actions: [],
                    },
                },
            ],
        };

        expect(isAuthoringDraftPackage(draftPackage)).toBeTrue();
    });

    it('accepts optional public Cognito auth runtime configuration', () => {
        const valid = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [
                { path: '/', pageId: 'default' },
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
            site: minimalSiteConfig(),
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'test-client-cognito',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST',
                    userPoolId: 'us-east-1_TEST',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://test-client.auth.us-east-1.amazoncognito.com',
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
        };

        expect(isDraftSiteConfigPayload(valid)).toBeTrue();
    });

    it('rejects secret or token material in public auth runtime configuration', () => {
        const base = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'test-client-cognito',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://test-client.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                },
            },
        };

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                auth: {
                    ...base.runtime.auth,
                    clientSecret: 'do-not-store-this',
                },
            },
        })).toBeFalse();
        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                auth: {
                    ...base.runtime.auth,
                    refreshToken: 'do-not-store-this',
                },
            },
        })).toBeFalse();
    });

    it('rejects unsafe public auth URLs and same-origin path fields', () => {
        const base = {
            version: 1,
            domain: TEST_DOMAIN,
            defaultPageId: 'default',
            routes: [
                { path: '/', pageId: 'default' },
                {
                    path: '/mi-cuenta',
                    pageId: 'account',
                    auth: {
                        required: true,
                        redirectTo: '/acceso',
                    },
                },
            ],
            site: minimalSiteConfig(),
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'test-client-cognito',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TEST',
                    clientId: 'public-web-client',
                    hostedUiDomain: 'https://test-client.auth.us-east-1.amazoncognito.com',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                    postLoginPath: '/mi-cuenta',
                    postLogoutPath: '/acceso',
                },
            },
        };
        const badUrls = [
            'http://test-client.auth.us-east-1.amazoncognito.com',
            '//evil.example',
            'javascript:alert(1)',
            'data:text/html,hello',
            ' https://test-client.auth.us-east-1.amazoncognito.com',
            'https://test-client.auth.us-east-1.amazoncognito.com/path with spaces',
            'https://user:pass@example.com/path',
            'https://user:pass@example.com',
            'https://example.com\\x',
            'https://example.com/path\\x',
        ];
        const badPaths = [
            'https://evil.example/acceso',
            '//evil.example',
            'javascript:alert(1)',
            'data:text/html,hello',
            'acceso',
            '/bad path',
            '/bad\tpath',
            ' /acceso',
        ];

        badUrls.forEach((issuer) => {
            expect(isDraftSiteConfigPayload({
                ...base,
                runtime: { auth: { ...base.runtime.auth, issuer } },
            })).withContext(`issuer ${ issuer }`).toBeFalse();
        });
        badUrls.forEach((hostedUiDomain) => {
            expect(isDraftSiteConfigPayload({
                ...base,
                runtime: { auth: { ...base.runtime.auth, hostedUiDomain } },
            })).withContext(`hostedUiDomain ${ hostedUiDomain }`).toBeFalse();
        });
        (['redirectPath', 'logoutPath', 'loginPath', 'postLoginPath', 'postLogoutPath'] as const).forEach((field) => {
            badPaths.forEach((pathValue) => {
                expect(isDraftSiteConfigPayload({
                    ...base,
                    runtime: {
                        auth: {
                            ...base.runtime.auth,
                            [field]: pathValue,
                        },
                    },
                })).withContext(`${ field } ${ pathValue }`).toBeFalse();
            });
        });
        badPaths.forEach((redirectTo) => {
            expect(isDraftSiteConfigPayload({
                ...base,
                routes: [
                    { path: '/', pageId: 'default' },
                    {
                        path: '/mi-cuenta',
                        pageId: 'account',
                        auth: {
                            required: true,
                            redirectTo,
                        },
                    },
                ],
            })).withContext(`route redirectTo ${ redirectTo }`).toBeFalse();
        });
    });

    it('accepts parameterized runtime data sources with page scoping', () => {
        const valid = {
            version: 1,
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            defaultPageId: 'default',
            routes: [
                { path: '/', pageId: 'default' },
                { path: '/pokemon', pageId: 'pokemon-detail' },
            ],
            sitemap: {
                excludePaths: ['/pokemon'],
                urls: [
                    '/',
                    '/pokemon?name=charizard',
                ],
            },
            site: {
                appIdentity: {
                    identifier: 'pokeapi-demo',
                    name: 'PokeAPI Demo',
                },
                theme: {
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#111111',
                            linkColor: '#0d6efd',
                            accentColor: '#f4c430',
                            secondaryBgColor: '#f7f7f7',
                            secondaryTextColor: '#222222',
                            secondaryTitleColor: '#111111',
                            secondaryLinkColor: '#0d6efd',
                            secondaryAccentColor: '#2e8b57',
                            successColor: '#2e8b57',
                            onSuccessColor: '#ffffff',
                            errorColor: '#d7462f',
                            onErrorColor: '#ffffff',
                            warningColor: '#f4c430',
                            onWarningColor: '#111111',
                            infoColor: '#2864a8',
                            onInfoColor: '#ffffff',
                        },
                        dark: {
                            bgColor: '#10131a',
                            textColor: '#f7f7f7',
                            titleColor: '#ffffff',
                            linkColor: '#9fd3ff',
                            accentColor: '#f4c430',
                            secondaryBgColor: '#171b24',
                            secondaryTextColor: '#e7e7e7',
                            secondaryTitleColor: '#ffffff',
                            secondaryLinkColor: '#9fd3ff',
                            secondaryAccentColor: '#8ee6a8',
                            successColor: '#8ee6a8',
                            onSuccessColor: '#10131a',
                            errorColor: '#ff8a7a',
                            onErrorColor: '#10131a',
                            warningColor: '#f4c430',
                            onWarningColor: '#10131a',
                            infoColor: '#9fd3ff',
                            onInfoColor: '#10131a',
                        },
                    },
                },
                i18n: {
                    defaultLanguage: 'es',
                    supportedLanguages: ['es'],
                },
            },
            runtime: {
                dataSources: [
                    {
                        id: 'pokeapi-selected-pokemon',
                        proxySourceId: 'pokeapiPokemonDetail',
                        target: 'remote.pokemon.selected',
                        pageIds: ['pokemon-detail'],
                        ssr: true,
                        requiredInputKeys: ['pokemonName'],
                        skipWhenQueryParams: ['move'],
                        input: {
                            pokemonName: {
                                source: 'queryParam',
                                key: 'name',
                                fallback: 'pikachu',
                                transforms: ['trim', 'lowercase'],
                            },
                            articleId: {
                                source: 'routeParam',
                                key: 'id',
                                transforms: ['trim'],
                            },
                            offset: {
                                source: 'queryParamPageOffset',
                                pageKey: 'page',
                                pageSizeKey: 'pageSize',
                                pageFallback: 1,
                                pageSizeFallback: 4,
                            },
                        },
                        mapper: {
                            itemsPath: 'items',
                            fields: {
                                name: 'name',
                            },
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(valid)).toBeTrue();
    });

    it('accepts runtime data source mapper transforms', () => {
        const payload = {
            version: 1,
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
            runtime: {
                dataSources: [
                    {
                        id: 'pokemon-index',
                        proxySourceId: 'pokeapiPokemonIndex',
                        target: 'remote.pokemon.catalog',
                        mapper: {
                            itemsPath: 'results',
                            prependItems: [
                                {
                                    value: 'all',
                                    label: 'Todos',
                                },
                            ],
                            fields: {
                                id: {
                                    path: 'url',
                                    transform: 'lastPathSegmentNumber',
                                },
                                label: {
                                    path: 'name',
                                    transform: 'titleCase',
                                },
                                href: {
                                    path: 'name',
                                    transform: 'uriComponent',
                                    prefix: '/pokemon?name=',
                                },
                                tagsText: {
                                    path: 'tags',
                                    transform: 'joinList',
                                },
                            },
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(payload)).toBeTrue();
    });

    it('accepts content hub runtime data sources and actions with public identifiers only', () => {
        const payload = {
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
            runtime: {
                contentHubs: [
                    {
                        hubId: 'zoosite-main',
                        ownerDraftDomain: 'zoositioweb.com.mx',
                        source: 'primary',
                        routeBasePath: '/blog',
                        listPath: '/blog',
                        articlePathPattern: '/blog/:categorySlug/:articleSlug',
                        defaultLocale: 'es',
                        locales: ['es', 'en'],
                        canonicalMode: 'host-adaptive',
                        publicArticles: [
                            {
                                articleId: 'art_20260620_blog_builder',
                                locale: 'es',
                                status: 'published',
                                title: 'Cómo crear blogs visuales',
                                summary: 'Guía pública para el hub.',
                                path: '/blog/web/blog-builder-seo',
                                categorySlug: 'web',
                                tags: ['seo', 'builder'],
                                publishedAt: '2026-06-21T15:00:00.000Z',
                                updatedAt: '2026-06-21T15:00:00.000Z',
                                authorLabel: 'Equipo zoositioweb',
                                canonicalPath: '/blog/web/blog-builder-seo',
                                robots: 'index,follow',
                            },
                        ],
                        publicTaxonomy: [
                            {
                                taxonomyId: 'web',
                                kind: 'category',
                                slug: 'web',
                                label: 'Web',
                                locale: 'es',
                                visible: true,
                                path: '/blog/web',
                            },
                        ],
                    },
                ],
                dataSources: [
                    {
                        id: 'content-hub-articles',
                        kind: 'content-hub',
                        proxySourceId: 'contentHubArticleList',
                        target: 'remote.contentHub.articles',
                        contentHub: {
                            read: 'articleList',
                            hubId: 'zoosite-main',
                            language: 'es',
                        },
                        input: {
                            limit: 20,
                            status: 'draft',
                        },
                    },
                ],
                apiActions: [
                    {
                        id: 'publish-article',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubPublish',
                        method: 'POST',
                        statusTarget: 'remoteStatus.contentHub.publish',
                        inputFields: ['articleId', 'language', 'revisionId', 'publishMessage'],
                        requiresUserGesture: true,
                        contentHub: {
                            action: 'publish',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(payload)).toBeTrue();
    });

    it('rejects unsafe public content hub SEO indexes', () => {
        const baseHub = {
            hubId: 'zoosite-main',
            ownerDraftDomain: 'zoositioweb.com.mx',
            source: 'primary',
            routeBasePath: '/blog',
            listPath: '/blog',
            articlePathPattern: '/blog/:categorySlug/:articleSlug',
            defaultLocale: 'es',
            locales: ['es'],
            canonicalMode: 'host-adaptive',
        };
        const base = {
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                contentHubs: [{
                    ...baseHub,
                    publicArticles: [{
                        articleId: 'art_20260620_blog_builder',
                        locale: 'es',
                        status: 'published',
                        title: 'Artículo',
                        path: 'https://evil.example/blog',
                        publishedAt: '2026-06-21T15:00:00.000Z',
                    }],
                }],
            },
        })).withContext('external article path').toBeFalse();

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                contentHubs: [{
                    ...baseHub,
                    publicArticles: [{
                        articleId: 'art_20260620_blog_builder',
                        locale: 'es',
                        status: 'published',
                        title: 'Artículo',
                        path: '/blog/web/blog-builder-seo',
                        publishedAt: '2026-06-21T15:00:00.000Z',
                        credentialRef: 'ssm:/must-not-travel',
                    }],
                }],
            },
        })).withContext('server-only article key').toBeFalse();
    });

    it('rejects server-only content hub runtime data source and action fields', () => {
        const base = {
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
        };

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                credentialRef: 'ssm:/must-not-travel',
            },
        })).withContext('runtime.credentialRef').toBeFalse();

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                contentHubs: [
                    {
                        hubId: 'zoosite-main',
                        ownerDraftDomain: 'zoositioweb.com.mx',
                        source: 'primary',
                        routeBasePath: '/blog',
                        listPath: '/blog',
                        articlePathPattern: '/blog/:categorySlug/:articleSlug',
                        defaultLocale: 'es',
                        locales: ['es'],
                        canonicalMode: 'host-adaptive',
                        serverPolicy: { allow: true },
                    },
                ],
            },
        })).withContext('runtime.contentHubs[].serverPolicy').toBeFalse();

        const forbiddenDataSourceInputKeys = [
            'accessToken',
            'access_token',
            'credentialRef',
            'id_token',
            'upstreamUrl',
            'tableName',
            'bucketName',
            'authorizerPolicy',
            'groupsToRoles',
            'serverPolicy',
            'tenantId',
            'X-Amz-Signature',
        ];

        for (const field of forbiddenDataSourceInputKeys) {
            expect(isDraftSiteConfigPayload({
                ...base,
                runtime: {
                    dataSources: [
                        {
                            id: 'content-hub-articles',
                            kind: 'content-hub',
                            proxySourceId: 'contentHubArticleList',
                            target: 'remote.contentHub.articles',
                            contentHub: {
                                read: 'articleList',
                                hubId: 'zoosite-main',
                            },
                            input: {
                                [field]: 'must-not-travel',
                            },
                        },
                    ],
                },
            })).withContext(`runtime.dataSources[].input.${ field }`).toBeFalse();
        }

        const forbiddenActionInputFields = [
            'accessToken',
            'access_token',
            'credentialRef',
            'id_token',
            'upstreamUrl',
            'tableName',
            'bucketName',
            'authorizerPolicy',
            'groupsToRoles',
            'serverPolicy',
            'tenantId',
            'X-Amz-Signature',
        ];

        for (const field of forbiddenActionInputFields) {
            expect(isDraftSiteConfigPayload({
                ...base,
                runtime: {
                    apiActions: [
                        {
                            id: 'publish-article',
                            kind: 'content-hub',
                            proxyActionId: 'contentHubPublish',
                            inputFields: ['articleId', field],
                            contentHub: {
                                action: 'publish',
                                hubId: 'zoosite-main',
                            },
                        },
                    ],
                },
            })).withContext(`runtime.apiActions[].inputFields includes ${ field }`).toBeFalse();
        }

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                dataSources: [
                    {
                        id: 'content-hub-articles',
                        kind: 'content-hub',
                        proxySourceId: 'contentHubArticleList',
                        target: 'remote.contentHub.articles',
                        contentHub: {
                            read: 'articleList',
                            action: 'publish',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
        })).withContext('runtime.dataSources[].contentHub cannot mix read/action').toBeFalse();

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                dataSources: [
                    {
                        id: 'content-hub-articles',
                        kind: 'content-hub',
                        proxySourceId: 'contentHubArticleList',
                        target: 'remote.contentHub.articles',
                        contentHub: {
                            read: 'articleList',
                            hubId: 'zoosite-main',
                        },
                        input: {
                            package: {
                                assetUrl: 'https://assets.example.test/file.png?X-Amz-Signature=must-not-travel',
                            },
                        },
                    },
                ],
            },
        })).withContext('runtime.dataSources[].input signed URL value').toBeFalse();

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                dataSources: [
                    {
                        id: 'content-hub-articles',
                        kind: 'content-hub',
                        proxySourceId: '../unsafe',
                        target: 'remote.contentHub.articles',
                        contentHub: {
                            read: 'articleList',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
        })).withContext('runtime.dataSources[].proxySourceId unsafe for content-hub').toBeFalse();

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                apiActions: [
                    {
                        id: 'publish-article',
                        kind: 'content-hub',
                        proxyActionId: 'contentHubPublish',
                        contentHub: {
                            read: 'articleList',
                            action: 'publish',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
        })).withContext('runtime.apiActions[].contentHub cannot mix action/read').toBeFalse();

        expect(isDraftSiteConfigPayload({
            ...base,
            runtime: {
                apiActions: [
                    {
                        id: 'publish-article',
                        kind: 'content-hub',
                        proxyActionId: '../unsafe',
                        contentHub: {
                            action: 'publish',
                            hubId: 'zoosite-main',
                        },
                    },
                ],
            },
        })).withContext('runtime.apiActions[].proxyActionId unsafe for content-hub').toBeFalse();
    });

    it('accepts runtime data source mapper lookups', () => {
        const payload = {
            version: 1,
            domain: 'preview.example.test',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
            runtime: {
                dataSources: [
                    {
                        id: 'content-feed',
                        target: 'remote.content.feed',
                        mapper: {
                            itemsPath: 'items',
                            fields: {
                                visualTokens: {
                                    path: 'category',
                                    lookup: {
                                        featured: {
                                            '--card-accent': '#f7b731',
                                        },
                                    },
                                    fallback: {
                                        '--card-accent': '#6c7a89',
                                    },
                                },
                            },
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(payload)).toBeTrue();
    });

    it('rejects malformed runtime data source mapper lookups', () => {
        const payload = {
            version: 1,
            domain: 'preview.example.test',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
            runtime: {
                dataSources: [
                    {
                        id: 'content-feed',
                        target: 'remote.content.feed',
                        mapper: {
                            fields: {
                                visualTokens: {
                                    path: 'category',
                                    lookup: [
                                        ['featured', { '--card-accent': '#f7b731' }],
                                    ],
                                },
                            },
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(payload)).toBeFalse();
    });

    it('rejects unknown runtime data source mapper transforms', () => {
        const payload = {
            version: 1,
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: minimalSiteConfig(),
            runtime: {
                dataSources: [
                    {
                        id: 'pokemon-index',
                        target: 'remote.pokemon.catalog',
                        mapper: {
                            fields: {
                                id: {
                                    path: 'url',
                                    transform: 'unknown',
                                },
                            },
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(payload)).toBeFalse();
    });

    it('rejects malformed parameterized runtime data source input config', () => {
        const invalid = {
            version: 1,
            domain: 'pokeapi-demo.zoolandingpage.com.mx',
            defaultPageId: 'default',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                appIdentity: {
                    identifier: 'pokeapi-demo',
                    name: 'PokeAPI Demo',
                },
                theme: {
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#111111',
                            linkColor: '#0d6efd',
                            accentColor: '#f4c430',
                            secondaryBgColor: '#f7f7f7',
                            secondaryTextColor: '#222222',
                            secondaryTitleColor: '#111111',
                            secondaryLinkColor: '#0d6efd',
                            secondaryAccentColor: '#2e8b57',
                            successColor: '#2e8b57',
                            onSuccessColor: '#ffffff',
                            errorColor: '#d7462f',
                            onErrorColor: '#ffffff',
                            warningColor: '#f4c430',
                            onWarningColor: '#111111',
                            infoColor: '#2864a8',
                            onInfoColor: '#ffffff',
                        },
                        dark: {
                            bgColor: '#10131a',
                            textColor: '#f7f7f7',
                            titleColor: '#ffffff',
                            linkColor: '#9fd3ff',
                            accentColor: '#f4c430',
                            secondaryBgColor: '#171b24',
                            secondaryTextColor: '#e7e7e7',
                            secondaryTitleColor: '#ffffff',
                            secondaryLinkColor: '#9fd3ff',
                            secondaryAccentColor: '#8ee6a8',
                            successColor: '#8ee6a8',
                            onSuccessColor: '#10131a',
                            errorColor: '#ff8a7a',
                            onErrorColor: '#10131a',
                            warningColor: '#f4c430',
                            onWarningColor: '#10131a',
                            infoColor: '#9fd3ff',
                            onInfoColor: '#10131a',
                        },
                    },
                },
                i18n: {
                    defaultLanguage: 'es',
                    supportedLanguages: ['es'],
                },
            },
            runtime: {
                dataSources: [
                    {
                        id: 'pokeapi-selected-pokemon',
                        proxySourceId: 'pokeapiPokemonDetail',
                        target: 'remote.pokemon.selected',
                        pageIds: ['pokemon-detail', 25],
                        input: {
                            pokemonName: {
                                source: 'queryParam',
                                fallback: 'pikachu',
                            },
                        },
                    },
                ],
            },
        };

        expect(isDraftSiteConfigPayload(invalid)).toBeFalse();
    });

    it('rejects site-config payloads without required site metadata', () => {
        const invalid = {
            version: 1,
            domain: 'zoolandingpage.com.mx',
            routes: [{ path: '/', pageId: 'default' }],
            site: {
                appIdentity: {
                    identifier: 'zoolandingpagecommx',
                },
            },
        };

        expect(isDraftSiteConfigPayload(invalid)).toBeFalse();
    });

    it('validates components payloads', () => {
        const valid = createComponentsPayload({});
        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts generic button loading state payloads', () => {
        const valid = createComponentsPayload({
            signinButton: {
                id: 'signinButton',
                type: 'button',
                valueInstructions: 'set:config.loading,when,"all:varEq,authForm.signin.state,loading",true,false',
                config: {
                    type: 'button',
                    label: 'Entrar',
                    loadingLabel: 'Entrando...',
                    loading: false,
                    loadingClasses: 'zlp-cursor-wait ank-opacity-0_85',
                    disabledWhenInvalidScope: true,
                    disabledClasses: 'zlp-cursor-not-allowed ank-opacity-0_45',
                    spinnerClasses: 'zlp-button-spinner',
                },
            },
        });

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects malformed generic button loading state payloads', () => {
        const invalid = createComponentsPayload({
            signinButton: {
                id: 'signinButton',
                type: 'button',
                config: {
                    label: 'Entrar',
                    loadingLabel: false,
                    loading: 'yes',
                    loadingClasses: 123,
                },
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('accepts interaction-scope and input component payloads', () => {
        const valid = createComponentsPayload({
            leadScope: {
                id: 'leadScope',
                type: 'interaction-scope',
                config: {
                    scopeId: 'leadForm',
                    tag: 'form',
                    components: ['emailField'],
                    computations: [
                        {
                            resultId: 'score',
                            initial: { source: 'literal', value: 10 },
                            steps: [{ op: 'multiply', value: { source: 'literal', value: 2 } }],
                        },
                    ],
                },
            },
            emailField: {
                id: 'emailField',
                type: 'input',
                config: {
                    fieldId: 'email',
                    controlType: 'text',
                    showValidationChecklist: true,
                    validationChecklistClasses: 'checklist',
                    validation: [
                        { type: 'email' },
                        { type: 'matchesField', fieldId: 'confirmEmail', message: 'Emails must match.' },
                    ],
                },
            },
        });

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts generic-card payloads', () => {
        const valid = createComponentsPayload({
            serviceCardTemplate: {
                id: 'serviceCardTemplate',
                type: 'generic-card',
                config: {
                    variant: 'feature',
                    icon: 'rocket_launch',
                    title: 'Launch faster',
                    description: 'A reusable feature card.',
                    benefits: ['One', 'Two'],
                    buttonLabel: 'Request info',
                    actions: [
                        {
                            label: 'Aprobar',
                            ariaLabel: 'Aprobar usuario',
                            eventInstructions: 'authAdminAction:approveUser,user-sub,zoosite-client,remoteStatus.adminUsersAction',
                            confirmMessage: 'Confirma que quieres aprobar este usuario.',
                            classes: 'approveButton',
                            icon: 'check_circle',
                            iconClasses: 'featureCardActionIcon',
                            iconPosition: 'before',
                        },
                        {
                            label: 'Restablecer MFA',
                            ariaLabel: 'Restablecer MFA de usuario',
                            eventInstructions: 'authAdminAction:resetUserMfa,user-sub,,remoteStatus.adminUsersAction',
                            confirmMessage: 'Confirma que quieres restablecer MFA para este usuario.',
                        },
                    ],
                    actionListClasses: 'featureCardActions',
                    actionButtonClasses: 'featureCardAction',
                    featureTitleClasses: 'featureCardTitle',
                    benefitIconClasses: 'featureCardBenefitIcon',
                    classes: 'featureCard',
                },
            },
            reviewCardTemplate: {
                id: 'reviewCardTemplate',
                type: 'generic-card',
                config: {
                    variant: 'testimonial',
                    name: 'Ada',
                    role: 'Founder',
                    company: 'Example Co',
                    content: 'Excellent work.',
                    rating: 5,
                    avatar: 'A',
                    verified: true,
                    testimonialContentClasses: 'reviewCardContent',
                },
            },
        });

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts qr-code payloads without exposing encoded values as visible text fields', () => {
        const valid = createComponentsPayload({
            mfaSetupQr: {
                id: 'mfaSetupQr',
                type: 'qr-code',
                valueInstructions: 'set:config.value,var,authForm.startMfaEnrollment.data.setup.otpauthUri',
                config: {
                    id: 'mfa-setup-qr',
                    value: '',
                    ariaLabel: 'Código QR para configurar verificación en dos pasos',
                    classes: 'mfaQrShell',
                    gridClasses: 'mfaQrGrid',
                    moduleClasses: 'mfaQrModule',
                    size: 220,
                    margin: 2,
                    errorCorrectionLevel: 'M',
                    darkColor: '#0d141c',
                    lightColor: '#ffffff',
                    emptyText: 'QR no disponible',
                },
            },
        });

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts generic content-builder primitive payloads', () => {
        const valid = createComponentsPayload({
            articleTable: {
                id: 'articleTable',
                type: 'generic-table',
                config: {
                    id: 'article-admin-table',
                    label: 'Artículos',
                    rowsSource: { source: 'var', path: 'contentHub.articles', fallback: [] },
                    rowIdPath: 'articleId',
                    eventPayloadFields: ['articleId', 'status'],
                    actionColumnLabel: 'Acciones',
                    actionLabelMode: 'tooltip',
                    actionButtonStyles: {
                        display: 'inline-flex',
                        minHeight: '44px',
                        padding: '0',
                    },
                    actionIconClasses: 'ank-width-14px ank-height-14px',
                    columns: [
                        { id: 'title', header: 'Título', valuePath: 'title' },
                        { id: 'status', header: 'Estado', valuePath: 'status' },
                        { id: 'tags', header: 'Tags', valuePath: 'tags', format: 'list', itemPath: 'label', separator: ', ' },
                    ],
                    pagination: { enabled: true, pageSize: 10, pageSizeOptions: [10, 25] },
                    selection: { enabled: true, mode: 'multiple', label: 'Seleccionar artículo' },
                    rowActions: [
                        {
                            id: 'edit',
                            label: 'Editar',
                            icon: 'edit',
                            hrefTemplate: '/admin/blog/articulos/{articleId}/editor?articleId={articleId}',
                        },
                    ],
                },
            },
            articleStatusCell: {
                id: 'articleStatusCell',
                type: 'generic-cell',
                config: {
                    id: 'statusCell',
                    value: 'published',
                    format: 'text',
                    componentIds: ['statusBadge'],
                    separator: ', ',
                },
            },
            articleBody: {
                id: 'articleBody',
                type: 'generic-rich-text',
                config: {
                    fieldId: 'body',
                    provider: 'quill',
                    format: 'quill-delta-json',
                    label: 'Contenido',
                    toolbar: ['bold', 'italic', 'heading', 'bulletList', 'link', 'clean'],
                    sanitizerPolicyId: 'trusted-authors',
                },
            },
            articleAssets: {
                id: 'articleAssets',
                type: 'generic-file-dropzone',
                config: {
                    fieldId: 'assets',
                    label: 'Archivos',
                    accept: 'image/*,.pdf',
                    maxFileSizeBytes: 5242880,
                    multiple: true,
                    dropLabel: 'Arrastra archivos',
                },
            },
        });

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects unsafe or malformed generic content-builder primitive payloads', () => {
        const invalid = createComponentsPayload({
            articleTable: {
                id: 'articleTable',
                type: 'generic-table',
                config: {
                    credentialRef: 'ssm:/not-for-browser',
                    columns: [{ id: 'title', onClick: 'alert(1)' }],
                    rowActions: [{ id: 'edit', label: '' }],
                },
            },
            articleBody: {
                id: 'articleBody',
                type: 'generic-rich-text',
                config: {
                    fieldId: 'body',
                    provider: 'script',
                },
            },
            articleAssets: {
                id: 'articleAssets',
                type: 'generic-file-dropzone',
                config: {
                    fieldId: 'assets',
                    maxFileSizeBytes: 'large',
                },
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects malformed qr-code payloads', () => {
        const invalid = createComponentsPayload({
            mfaSetupQr: {
                id: 'mfaSetupQr',
                type: 'qr-code',
                config: {
                    value: 'qr-payload',
                    size: 0,
                    margin: -1,
                    errorCorrectionLevel: 'Z',
                },
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects malformed generic-card action configs', () => {
        const invalid = createComponentsPayload({
            badActionCard: {
                id: 'badActionCard',
                type: 'generic-card',
                config: {
                    variant: 'feature',
                    title: 'User',
                    actions: [
                        {
                            label: '',
                            iconPosition: 'left',
                        },
                    ],
                },
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('accepts explicit loopConfig bindings in components payloads', () => {
        const valid = createComponentsPayload({
            socialLinkTemplate: {
                id: 'socialLinkTemplate',
                type: 'link',
                config: {
                    id: 'socialLinkTemplate',
                    href: '#',
                    text: '',
                    ariaLabel: '',
                },
            },
            socialLinks: {
                id: 'socialLinks',
                type: 'container',
                loopConfig: {
                    source: 'var',
                    path: 'socialLinks',
                    templateId: 'socialLinkTemplate',
                    idPrefix: 'socialLink',
                    view: {
                        filters: [
                            {
                                path: 'label',
                                op: 'contains',
                                value: { source: 'queryParam', key: 'q' },
                                ignoreValues: [''],
                            },
                        ],
                    },
                    bindings: [
                        {
                            to: 'config.href',
                            sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }],
                        },
                        {
                            to: 'config.href',
                            sources: [{ from: 'slug', transform: 'uriComponent' }],
                            prefix: '/blog/',
                            suffix: '#article',
                        },
                        {
                            to: 'config.text',
                            sources: ['icon', { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }],
                        },
                    ],
                },
                config: {
                    tag: 'div',
                    components: [],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects loopConfig bindings with unknown transforms', () => {
        const invalid = createComponentsPayload({
            badLoop: {
                id: 'badLoop',
                type: 'container',
                loopConfig: {
                    source: 'i18n',
                    path: 'items',
                    templateId: 'itemTemplate',
                    bindings: [
                        {
                            to: 'config.text',
                            sources: [{ from: 'label', transform: 'unknownTransform' }],
                        },
                    ],
                },
                config: {
                    tag: 'div',
                    components: [],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects retired feature-card and testimonial-card payloads', () => {
        const invalid = createComponentsPayload({
            oldFeatureCard: {
                id: 'oldFeatureCard',
                type: 'feature-card',
                config: {},
            },
            oldTestimonialCard: {
                id: 'oldTestimonialCard',
                type: 'testimonial-card',
                config: {},
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('accepts textarea input payloads', () => {
        const valid = createComponentsPayload({
            messageField: {
                id: 'messageField',
                type: 'input',
                config: {
                    fieldId: 'message',
                    controlType: 'textarea',
                    rows: 6,
                    validation: [{ type: 'minLength', value: 20 }],
                },
            },
        });

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts file input payloads for draft-configured uploads', () => {
        const valid = createComponentsPayload({
            heroImageField: {
                id: 'heroImageField',
                type: 'input',
                eventInstructions: 'uploadPublicImage:heroImageUpload,event.eventData.value,hero-image,hero,1600,1600',
                config: {
                    fieldId: 'heroImageFile',
                    controlType: 'file',
                    accept: 'image/*',
                    helperText: 'Select an image to upload.',
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts select input payloads with draft-owned dropdown presentation config', () => {
        const valid = createComponentsPayload({
            matterTypeField: {
                id: 'matterTypeField',
                type: 'input',
                config: {
                    fieldId: 'matterType',
                    controlType: 'select',
                    fieldClasses: 'ank-width-100per',
                    inputClasses: 'formInput formSelectTrigger',
                    dropdownTriggerClasses: 'ank-width-100per ank-display-flex ank-alignItems-center ank-justifyContent-spaceBetween ank-gap-12px',
                    dropdownIndicatorText: '▾',
                    dropdownIndicatorClasses: 'ank-display-inlineFlex ank-alignItems-center',
                    dropdownTriggerTextConfig: {
                        classes: 'ank-display-block ank-flex-1 ank-overflow-hidden formSelectTriggerText',
                    },
                    dropdownConfig: {
                        classes: 'formDropdown',
                        menuContainerClasses: 'formDropdownMenu',
                        menuRole: 'listbox',
                        itemRole: 'option',
                        triggerRole: 'combobox',
                        overlayMatchWidth: 'origin',
                        overlayOffsetY: 8,
                    },
                    options: [
                        { value: 'contract-review', label: 'Contract review' },
                        { value: 'corporate-advisory', label: 'Corporate advisory' },
                    ],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts interaction scopes with field-scoped auto-submit config', () => {
        const valid = createComponentsPayload({
            catalogControls: {
                id: 'catalogControls',
                type: 'interaction-scope',
                config: {
                    scopeId: 'pokemonCatalogView',
                    tag: 'form',
                    autoSubmit: {
                        enabled: true,
                        enabledFieldId: 'autoSearch',
                        eventNames: ['valueChanged'],
                        fieldIds: ['type', 'attack', 'sort', 'pageSize'],
                    },
                    submitEventInstructions: 'navigateWithScopeQuery:/,#pokemon-grid,type=values.type,move=values.attack,page=1',
                    components: ['filterTypeInput'],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts switch inputs and autocomplete options', () => {
        const valid = createComponentsPayload({
            catalogSearch: {
                id: 'catalogSearch',
                type: 'input',
                config: {
                    fieldId: 'pokemon',
                    controlType: 'text',
                    inputType: 'search',
                    autocompleteMinLength: 3,
                    autocompleteMaxOptions: 20,
                    autocompleteMatchMode: 'startsWith',
                    autocompleteOptions: {
                        source: 'var',
                        path: 'remote.pokemon.index.items',
                        fallback: [
                            { value: 'bulbasaur', label: 'Bulbasaur' },
                            { value: 'charmander', label: 'Charmander' },
                        ],
                    },
                },
            },
            publishAtInput: {
                id: 'publishAtInput',
                type: 'input',
                config: {
                    fieldId: 'publishAt',
                    controlType: 'text',
                    inputType: 'datetime-local',
                },
            },
            attackFilter: {
                id: 'attackFilter',
                type: 'input',
                config: {
                    fieldId: 'move',
                    controlType: 'select',
                    options: {
                        source: 'var',
                        path: 'remote.pokemon.moveOptions.items',
                        fallback: [{ value: 'all', label: 'Todos' }],
                    },
                },
            },
            autoSearchSwitch: {
                id: 'autoSearchSwitch',
                type: 'input',
                config: {
                    fieldId: 'autoSearch',
                    controlType: 'switch',
                    value: true,
                    label: 'Auto search',
                    fieldClasses: 'autoSearchSwitch',
                    inputClasses: 'autoSearchSwitchInput',
                    switchTrackClasses: 'autoSearchSwitchTrack',
                    switchTrackActiveClasses: 'autoSearchSwitchTrackActive',
                    switchThumbClasses: 'autoSearchSwitchThumb',
                    switchThumbActiveClasses: 'autoSearchSwitchThumbActive',
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts search-box payloads with authored suggestions and trigger config', () => {
        const valid = createComponentsPayload({
            headerSearch: {
                id: 'headerSearch',
                type: 'search-box',
                config: {
                    minLength: 1,
                    debounceMs: 0,
                    collapsed: true,
                    triggerIcon: 'search',
                    closeIcon: 'arrow_back',
                    triggerAriaLabel: 'Open search',
                    closeAriaLabel: 'Close search',
                    resultItemClasses: 'search-result-item',
                    statusItemClasses: 'search-status-item',
                    suggestions: [
                        { id: 'services', label: 'Services', href: '/services' },
                        { id: 'contact', label: 'Contact', href: '/contact', target: '_self' },
                    ],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts accordion payloads with detail-mode authored icons', () => {
        const valid = createComponentsPayload({
            faqAccordion: {
                id: 'faqAccordion',
                type: 'accordion',
                config: {
                    renderMode: 'detail',
                    toggleIconName: 'expand_more',
                    detailMetaIconName: 'schedule',
                    detailItemIconName: 'check_circle',
                    items: [
                        {
                            id: 'faq-1',
                            title: 'Question',
                            summary: 'Short answer',
                            content: 'Long answer',
                            meta: '2 days',
                            detailItems: ['One', 'Two'],
                        },
                    ],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts stats-counter payloads with plain authored formatting fields', () => {
        const valid = createComponentsPayload({
            visitsCounter: {
                id: 'visitsCounter',
                type: 'stats-counter',
                valueInstructions: 'set:config.target,var,statsCounters.visits.target; set:config.formatMode,var,statsCounters.visits.formatMode',
                config: {
                    target: 0,
                    durationMs: 1600,
                    startOnVisible: true,
                    ariaLabel: 'Visits',
                    formatMode: 'prefix',
                    formatPrefix: '+',
                    formatSuffix: '',
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('accepts tooltip payloads with safe anchor and content fields', () => {
        const valid = createComponentsPayload({
            searchTooltip: {
                id: 'searchTooltip',
                type: 'tooltip',
                valueInstructions: 'set:config.content,i18n,actions.search,Search',
                config: {
                    for: 'search-button',
                    content: 'Search',
                    position: 'top',
                    trigger: 'both',
                    showDelayMs: 120,
                    hideDelayMs: 80,
                    surfaceClasses: 'tooltip-surface',
                    arrowClasses: 'tooltip-arrow',
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects stats-counter payloads with temporary config fields', () => {
        const invalid = createComponentsPayload({
            avgTimeCounter: {
                id: 'avgTimeCounter',
                type: 'stats-counter',
                config: {
                    target: 120,
                    rawTarget: 300,
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('accepts tab-group payloads with split-detail authored icons', () => {
        const valid = createComponentsPayload({
            processTabs: {
                id: 'processTabs',
                type: 'tab-group',
                config: {
                    layout: 'split-detail',
                    detailMetaIconName: 'schedule',
                    detailItemIconName: 'check_circle',
                    tabs: [
                        {
                            id: 'step-1',
                            label: 'Step 1',
                            summary: 'Summary',
                            content: 'Details',
                            meta: '48 hours',
                            detailItems: ['First action'],
                        },
                    ],
                },
            },
        }, TEST_DOMAIN);

        expect(isComponentsPayload(valid)).toBeTrue();
    });

    it('rejects invalid input payload shape', () => {
        const invalid = createComponentsPayload({
            brokenField: {
                id: 'brokenField',
                type: 'input',
                config: {
                    controlType: 'text',
                },
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects generic-card payloads with runtime-only fields', () => {
        const invalid = createComponentsPayload({
            serviceCardTemplate: {
                id: 'serviceCardTemplate',
                type: 'generic-card',
                config: {
                    variant: 'feature',
                    title: 'Launch faster',
                    onCta: 'not-allowed-in-json',
                },
            },
        });

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('rejects duplicate component ids in the same payload array', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: TEST_DOMAIN,
            components: [
                {
                    id: 'duplicate',
                    type: 'text',
                    config: { text: 'One' },
                },
                {
                    id: 'duplicate',
                    type: 'text',
                    config: { text: 'Two' },
                },
            ],
        };

        expect(isComponentsPayload(invalid)).toBeFalse();
    });

    it('validates variables payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                a: 1,
                appIdentity: {
                    identifier: 'zoolandingpagecommx',
                    name: 'Zoo Landing Page',
                    description: 'Draft-driven landing page.',
                },
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        whatsappMessageKey: 'ui.contact.whatsappMessage',
                        faqMessageKey: 'ui.sections.faq.subtitle',
                        finalCtaMessageKey: 'hero.subtitle',
                    },
                },
            },
            computed: { b: 2 },
        };
        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('accepts variables payloads without site-owned metadata', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    modals: {
                        _default: {
                            closeOnBackdrop: true,
                        },
                    },
                },
                statsCounters: {
                    visits: {
                        target: 12450,
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('rejects invalid variables.appIdentity shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                appIdentity: {
                    identifier: 123,
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid optional variables.ui.contact message keys', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                        faqMessageKey: 123,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.ui.contact shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    contact: {
                        whatsappPhone: '',
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });
    it('accepts valid variables.statsCounters shape', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        target: 12450,
                        durationMs: 1600,
                        formatPrefix: '+',
                        formatMode: 'number',
                        formatSuffix: '',
                    },
                    cta: {
                        target: 370,
                        durationMs: 1800,
                        formatMode: 'percent',
                        formatSuffix: '',
                    },
                    avgTime: {
                        target: 312,
                        durationMs: 2000,
                        min: 120,
                        max: 9999,
                        formatMode: 'suffix',
                        formatSuffix: 's',
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('accepts valid variables.theme shape', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                theme: {
                    defaultMode: 'dark',
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#222222',
                            linkColor: '#333333',
                            accentColor: '#444444',
                            secondaryBgColor: '#f5f5f5',
                            secondaryTextColor: '#555555',
                            secondaryTitleColor: '#666666',
                            secondaryLinkColor: '#777777',
                            secondaryAccentColor: '#888888',
                            successColor: '#198754',
                            onSuccessColor: '#052e1c',
                            errorColor: '#dc3545',
                            onErrorColor: '#3b0a10',
                            warningColor: '#f59e0b',
                            onWarningColor: '#3a2400',
                            infoColor: '#0d6efd',
                            onInfoColor: '#041b44',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                    ui: {
                        modalAccentColor: 'secondaryAccentColor',
                        legalModalAccentColor: 'secondaryAccentColor',
                        demoModalAccentColor: 'accentColor',
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('accepts valid variables.ui.modals shape', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                socialLinks: [
                    {
                        url: 'https://example.com/facebook',
                        icon: '📘',
                        labelKey: 'footer.social.facebook.label',
                        ariaLabelKey: 'footer.social.facebook.ariaLabel',
                    },
                ],
                ui: {
                    contact: {
                        whatsappPhone: '+525522699563',
                    },
                    modals: {
                        _default: {
                            closeOnBackdrop: true,
                            showCloseButton: true,
                            panelClasses: 'modal-shell',
                            closeButtonClasses: 'modal-close-btn',
                        },
                        'terms-of-service': {
                            size: 'lg',
                            ariaLabelKey: 'footer.legal.terms.title',
                            showCloseButton: true,
                            panelDialogClasses: 'modal-panel-dialog',
                        },
                        'data-use': {
                            size: 'md',
                            ariaLabel: 'Data Use',
                            closeOnBackdrop: true,
                            accentColor: 'secondaryAccentColor',
                            ariaDescribedBy: 'data-use-description',
                        },
                    },
                    toast: {
                        hostClasses: 'toast-host',
                        itemClasses: 'toast-item',
                        hoveredItemClasses: 'toast-hovered',
                        levelSuccessClasses: 'toast-success',
                        iconSurfaceClasses: 'toast-icon-surface',
                        progressBarSurfaceClasses: 'toast-progress-surface',
                        iconErrorClasses: 'toast-icon-error-anim',
                        dismissButtonClasses: 'toast-dismiss',
                    },
                },
            },
        };

        expect(isVariablesPayload(valid)).toBeTrue();
    });

    it('rejects variables.theme with missing palette keys', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                theme: {
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects variables.theme with invalid defaultMode', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                theme: {
                    defaultMode: 'sepia',
                    palettes: {
                        light: {
                            bgColor: '#ffffff',
                            textColor: '#111111',
                            titleColor: '#222222',
                            linkColor: '#333333',
                            accentColor: '#444444',
                            secondaryBgColor: '#f5f5f5',
                            secondaryTextColor: '#555555',
                            secondaryTitleColor: '#666666',
                            secondaryLinkColor: '#777777',
                            secondaryAccentColor: '#888888',
                            successColor: '#198754',
                            onSuccessColor: '#052e1c',
                            errorColor: '#dc3545',
                            onErrorColor: '#3b0a10',
                            warningColor: '#f59e0b',
                            onWarningColor: '#3a2400',
                            infoColor: '#0d6efd',
                            onInfoColor: '#041b44',
                        },
                        dark: {
                            bgColor: '#000000',
                            textColor: '#fefefe',
                            titleColor: '#efefef',
                            linkColor: '#dddddd',
                            accentColor: '#cccccc',
                            secondaryBgColor: '#111111',
                            secondaryTextColor: '#bbbbbb',
                            secondaryTitleColor: '#aaaaaa',
                            secondaryLinkColor: '#999999',
                            secondaryAccentColor: '#888888',
                            successColor: '#32d583',
                            onSuccessColor: '#f3fff8',
                            errorColor: '#ff6b6b',
                            onErrorColor: '#fff5f5',
                            warningColor: '#f5b942',
                            onWarningColor: '#fff7e6',
                            infoColor: '#58a6ff',
                            onInfoColor: '#f5fbff',
                        },
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.ui.modals shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                ui: {
                    modals: {
                        'terms-of-service': {
                            size: 'xl',
                        },
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.socialLinks shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                socialLinks: [
                    {
                        icon: '📘',
                    },
                ],
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid variables.statsCounters shape', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        target: 'not-a-number',
                        durationMs: 1600,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects invalid statsCounters min/max values', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    avgTime: {
                        target: 312,
                        min: 'bad-min',
                        max: 9999,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('rejects non-string formatPrefix in statsCounters', () => {
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            variables: {
                statsCounters: {
                    visits: {
                        target: 100,
                        formatPrefix: 123,
                    },
                },
            },
        };

        expect(isVariablesPayload(invalid)).toBeFalse();
    });

    it('validates angora combos payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { btn: ['ank-p-1rem'] },
        };
        const invalid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            combos: { btn: 'ank-p-1rem' },
        };

        expect(isAngoraCombosPayload(valid)).toBeTrue();
        expect(isAngoraCombosPayload(invalid)).toBeFalse();
    });

    it('validates i18n payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            lang: 'es',
            dictionary: { hero: { title: 'Hola' } },
        };
        expect(isI18nPayload(valid)).toBeTrue();
    });

    it('accepts runtime bundles with a null route', () => {
        const palette = {
            bgColor: '#ffffff',
            textColor: '#111111',
            titleColor: '#222222',
            linkColor: '#333333',
            accentColor: '#444444',
            secondaryBgColor: '#f5f5f5',
            secondaryTextColor: '#555555',
            secondaryTitleColor: '#666666',
            secondaryLinkColor: '#777777',
            secondaryAccentColor: '#888888',
            successColor: '#198754',
            onSuccessColor: '#052e1c',
            errorColor: '#dc3545',
            onErrorColor: '#3b0a10',
            warningColor: '#f59e0b',
            onWarningColor: '#3a2400',
            infoColor: '#0d6efd',
            onInfoColor: '#041b44',
        };
        const components = createComponentsPayload({
            root: {
                id: 'root',
                type: 'container',
                config: { components: [] },
            },
        }, TEST_DOMAIN);

        expect(isRuntimeBundlePayload({
            version: 1,
            domain: TEST_DOMAIN,
            pageId: 'default',
            sourceStage: 'published',
            lang: 'en',
            route: null,
            siteConfig: {
                version: 1,
                domain: TEST_DOMAIN,
                defaultPageId: 'default',
                routes: [{ path: '/', pageId: 'default' }],
                site: {
                    appIdentity: {
                        identifier: 'previewexampletest',
                        name: 'Preview',
                    },
                    theme: {
                        palettes: {
                            light: palette,
                            dark: palette,
                        },
                    },
                    i18n: {
                        defaultLanguage: 'es',
                        supportedLanguages: ['es', 'en'],
                    },
                },
            },
            pageConfig: {
                version: 1,
                pageId: 'default',
                domain: TEST_DOMAIN,
                rootIds: ['root'],
            },
            components,
            i18n: {
                version: 1,
                pageId: 'default',
                domain: TEST_DOMAIN,
                lang: 'en',
                dictionary: {},
            },
        })).toBeTrue();
    });

    it('validates seo payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            title: { es: 'Titulo', en: 'Title' },
            description: 'Landing page description',
            canonical: 'https://zoolandingpage.com.mx/',
            keywords: {
                es: ['landing page', 'seo tecnico'],
                en: ['landing page', 'technical seo'],
            },
            robots: { default: 'index,follow,max-image-preview:large' },
        };
        expect(isSeoPayload(valid)).toBeTrue();
    });

    it('rejects seo payloads with invalid localized keywords', () => {
        const invalid = {
            keywords: {
                en: ['valid', 123],
            },
        };

        expect(isSeoPayload(invalid)).toBeFalse();
    });

    it('validates structured data payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            entries: [],
        };
        expect(isStructuredDataPayload(valid)).toBeTrue();
    });

    it('validates analytics config payloads', () => {
        const valid = {
            version: 1,
            pageId: 'default',
            domain: 'zoolandingpage.com.mx',
            sectionIds: ['home'],
            scrollMilestones: [10, 20],
            events: {
                page_view: 'page_view',
            },
            categories: {
                navigation: 'navigation',
            },
            quickStats: {
                pageView: {
                    event: 'page_view',
                    path: 'metrics.pageViews',
                    by: 1,
                },
                events: [
                    { name: 'cta_click', path: 'metrics.ctaClicks', by: 1 },
                ],
            },
        };
        expect(isAnalyticsConfigPayload(valid)).toBeTrue();
    });
});
