import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { RuntimeConfigService } from '@/app/shared/services/runtime-config.service';
import { TestBed } from '@angular/core/testing';
import { AuthCustomFormService } from './auth-custom-form.service';
import { AuthFacade } from './auth.facade';

describe('AuthCustomFormService', () => {
    let fetchSpy: jasmine.Spy;
    let auth: jasmine.SpyObj<AuthFacade>;

    beforeEach(() => {
        auth = jasmine.createSpyObj<AuthFacade>('AuthFacade', ['establishSession', 'requestSignOut']);
        fetchSpy = spyOn(globalThis, 'fetch').and.callFake(() => Promise.resolve(new Response(JSON.stringify({
            ok: true,
            status: 'confirmation-required',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })));

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                RuntimeConfigService,
                { provide: AuthFacade, useValue: auth },
                { provide: LanguageService, useValue: { currentLanguage: () => 'es' } },
            ],
        });

        window.history.pushState(
            {},
            '',
            '/acceso?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
        );
        TestBed.inject(ConfigStoreService).setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [
                { path: '/acceso', pageId: 'acceso' },
                { path: '/registro', pageId: 'registro' },
                { path: '/confirmar-cuenta', pageId: 'confirmar-cuenta' },
                { path: '/recuperar-contrasena', pageId: 'recuperar-contrasena' },
                { path: '/cambiar-contrasena', pageId: 'cambiar-contrasena' },
                {
                    path: '/mi-cuenta',
                    pageId: 'mi-cuenta',
                    auth: {
                        required: true,
                        redirectTo: '/acceso',
                        allowedGroups: ['zoosite-client', 'zoosite-admin'],
                    },
                },
            ],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Pq5OCadbK',
                    hostedUiDomain: 'https://zoosite-staff-planned.auth.us-east-1.amazoncognito.com',
                    clientId: 'public-client-id',
                    scopes: ['openid', 'email', 'profile'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    loginPath: '/acceso',
                    postLoginPath: '/mi-cuenta',
                    session: {
                        mode: 'server-cookie',
                        signinPath: '/auth/session/signin',
                        mePath: '/auth/session/me',
                        logoutPath: '/auth/session/logout',
                        csrfCookieName: 'zlp_csrf',
                        csrfHeaderName: 'X-ZLP-CSRF',
                    },
                },
            },
            site: {},
        } as any);
    });

    afterEach(() => {
        delete (document as unknown as { cookie?: string }).cookie;
        TestBed.resetTestingModule();
    });

    it('submits signup with only public form fields and server-resolved auth context', async () => {
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('signup', {
            email: 'Client@Example.Test',
            password: 'StrongPassphrase123!',
            confirmPassword: 'StrongPassphrase123!',
            tenantId: 'evil',
            groups: ['zoosite-admin'],
        });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.calls.argsFor(0);
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(String(url)).toContain('/auth/signup');
        expect(body).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            email: 'Client@Example.Test',
            password: 'StrongPassphrase123!',
            language: 'es',
        });
    });

    it('moves signup users to confirmation while preserving safe preview query params', async () => {
        window.history.pushState(
            {},
            '',
            '/registro?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
        );
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('signup', {
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
            confirmPassword: 'StrongPassphrase123!',
        });

        expect(window.location.pathname).toBe('/confirmar-cuenta');
        expect(window.location.search).toContain('authStatus=account-created');
        expect(window.location.search).toContain('draftDomain=zoositioweb.com.mx');
        expect(window.location.search).toContain('debugWorkspace=false');
        expect(window.location.search).toContain('lang=es');
    });

    it('moves confirmed signup users back to login with a success status', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'confirmed',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        window.history.pushState(
            {},
            '',
            '/confirmar-cuenta?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
        );
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('confirmSignup' as any, {
            email: 'client@example.test',
            code: '123456',
        });

        expect(window.location.pathname).toBe('/acceso');
        expect(window.location.search).toContain('authStatus=account-confirmed');
        expect(window.location.search).toContain('draftDomain=zoositioweb.com.mx');
        expect(window.location.search).toContain('debugWorkspace=false');
        expect(window.location.search).toContain('lang=es');
    });

    it('moves password recovery users to the code entry page after sending the code', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'code-sent',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        window.history.pushState(
            {},
            '',
            '/recuperar-contrasena?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
        );
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('forgotPassword' as any, {
            email: 'client@example.test',
        });

        expect(window.location.pathname).toBe('/cambiar-contrasena');
        expect(window.location.search).toContain('authStatus=password-code-sent');
        expect(window.location.search).toContain('draftDomain=zoositioweb.com.mx');
        expect(window.location.search).toContain('debugWorkspace=false');
        expect(window.location.search).toContain('lang=es');
    });

    it('moves successful password reset users back to login with a success status', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'password-reset',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        window.history.pushState(
            {},
            '',
            '/cambiar-contrasena?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
        );
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('confirmForgotPassword' as any, {
            email: 'client@example.test',
            code: '123456',
            password: 'NewStrongPassphrase123!',
            confirmPassword: 'NewStrongPassphrase123!',
        });

        expect(window.location.pathname).toBe('/acceso');
        expect(window.location.search).toContain('authStatus=password-reset');
        expect(window.location.search).toContain('draftDomain=zoositioweb.com.mx');
        expect(window.location.search).toContain('debugWorkspace=false');
        expect(window.location.search).toContain('lang=es');
    });

    it('submits signin and establishes only sanitized public session metadata', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'signed-in',
            session: {
                profile: {
                    subject: 'user-123',
                    email: 'client@example.test',
                    roles: ['zoosite-admin'],
                },
                provider: 'cognito',
                expiresAtEpochMs: 1999999999000,
                idToken: 'must-not-be-used',
            },
            idToken: 'must-not-be-used',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('signin' as any, {
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
            tenantId: 'evil',
        });

        const [url, init] = fetchSpy.calls.argsFor(0);
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(String(url)).toBe('/auth/session/signin');
        expect(init?.credentials).toBe('include');
        expect(body).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
            language: 'es',
        });
        expect(auth.establishSession).toHaveBeenCalledOnceWith({
            profile: {
                subject: 'user-123',
                email: 'client@example.test',
                roles: ['zoosite-admin'],
            },
            provider: 'cognito',
            expiresAtEpochMs: 1999999999000,
        });
        expect(window.location.pathname).toBe('/mi-cuenta');
        expect(window.location.search).toContain('draftDomain=zoositioweb.com.mx');
        expect(window.location.search).toContain('debugWorkspace=false');
        expect(window.location.search).toContain('lang=es');
    });

    it('logs out server-cookie custom sessions through the configured endpoint', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_csrf=csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'signed-out',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        window.history.pushState(
            {},
            '',
            '/mi-cuenta?draftDomain=zoositioweb.com.mx&debugWorkspace=false&lang=es',
        );
        const service = TestBed.inject(AuthCustomFormService);

        const response = await service.submit('logout' as any, {});

        expect(response).toEqual({ ok: true, status: 'signed-out' });
        expect(auth.requestSignOut).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/session/logout', jasmine.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-CSRF': 'csrf-token',
                'X-ZLP-Domain': 'zoositioweb.com.mx',
                'X-ZLP-Auth-Profile-Id': 'staff',
            }),
        }));
        expect(window.location.pathname).toBe('/acceso');
        expect(window.location.search).toContain('draftDomain=zoositioweb.com.mx');
        expect(window.location.search).toContain('debugWorkspace=false');
        expect(window.location.search).toContain('lang=es');
    });

    it('rejects mismatched password confirmation before any network request', async () => {
        const service = TestBed.inject(AuthCustomFormService);

        await expectAsync(service.submit('signup', {
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
            confirmPassword: 'DifferentPassphrase123!',
        })).toBeRejectedWithError('Passwords do not match.');

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('submits the custom signup confirmation lifecycle without sending tenant policy fields', async () => {
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('confirmSignup' as any, {
            email: 'client@example.test',
            code: '123456',
            groups: ['zoosite-admin'],
        });
        await service.submit('resendConfirmation' as any, {
            email: 'client@example.test',
            tenantId: 'evil',
        });
        await service.submit('confirmForgotPassword' as any, {
            email: 'client@example.test',
            code: '654321',
            password: 'NewStrongPassphrase123!',
            confirmPassword: 'NewStrongPassphrase123!',
            customTenantId: 'evil',
        });

        const requests = fetchSpy.calls.allArgs().map(([url, init]) => ({
            url: String(url),
            body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        }));
        expect(requests.map((request) => request.url)).toEqual([
            jasmine.stringMatching('/auth/confirm-signup') as unknown as string,
            jasmine.stringMatching('/auth/resend-confirmation') as unknown as string,
            jasmine.stringMatching('/auth/confirm-forgot-password') as unknown as string,
        ]);
        expect(requests.map((request) => request.body)).toEqual([
            {
                domain: 'zoositioweb.com.mx',
                authProfileId: 'staff',
                email: 'client@example.test',
                code: '123456',
                language: 'es',
            },
            {
                domain: 'zoositioweb.com.mx',
                authProfileId: 'staff',
                email: 'client@example.test',
                language: 'es',
            },
            {
                domain: 'zoositioweb.com.mx',
                authProfileId: 'staff',
                email: 'client@example.test',
                code: '654321',
                password: 'NewStrongPassphrase123!',
                language: 'es',
            },
        ]);
    });

    it('rejects mismatched password reset confirmation before any network request', async () => {
        const service = TestBed.inject(AuthCustomFormService);

        await expectAsync(service.submit('confirmForgotPassword' as any, {
            email: 'client@example.test',
            code: '654321',
            password: 'NewStrongPassphrase123!',
            confirmPassword: 'DifferentPassphrase123!',
        })).toBeRejectedWithError('Passwords do not match.');

        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
