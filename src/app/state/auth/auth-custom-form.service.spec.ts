import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { RuntimeConfigService } from '@/app/shared/services/runtime-config.service';
import { TestBed } from '@angular/core/testing';
import { AuthCustomFormRequestError, AuthCustomFormService } from './auth-custom-form.service';
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
                { path: '/verificar-acceso', pageId: 'verificar-acceso' },
                { path: '/configurar-mfa', pageId: 'configurar-mfa' },
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
        expect(window.location.href).not.toContain('client@example.test');
        expect(window.location.href).not.toContain('StrongPassphrase123!');
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

    it('moves software-token MFA signin challenges to the verification page without creating a session', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'challenge-required',
            challengeName: 'SOFTWARE_TOKEN_MFA',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        const response = await service.submit('signin' as any, {
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
        });

        expect(response.status).toBe('challenge-required');
        expect(auth.establishSession).not.toHaveBeenCalled();
        expect(window.location.pathname).toBe('/verificar-acceso');
        expect(window.location.search).toContain('authStatus=mfa-required');
        expect(window.location.href).not.toContain('client@example.test');
        expect(window.location.href).not.toContain('StrongPassphrase123!');
    });

    it('moves MFA setup signin challenges to the authenticator setup page', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'challenge-required',
            challengeName: 'MFA_SETUP',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('signin' as any, {
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
        });

        expect(auth.establishSession).not.toHaveBeenCalled();
        expect(window.location.pathname).toBe('/configurar-mfa');
        expect(window.location.search).toContain('authStatus=mfa-setup-required');
    });

    it('responds to software-token MFA challenges through same-origin credentials', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_challenge_csrf=challenge-csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'signed-in',
            session: {
                profile: {
                    subject: 'user-123',
                    email: 'client@example.test',
                    roles: ['zoosite-client'],
                },
                provider: 'cognito',
                expiresAtEpochMs: 1999999999000,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('respondMfaChallenge' as any, {
            code: '123456',
        });

        const [url, init] = fetchSpy.calls.argsFor(0);
        expect(String(url)).toBe('/auth/session/challenge/respond');
        expect(init?.credentials).toBe('include');
        expect((init?.headers as Record<string, string>)['X-ZLP-CSRF']).toBe('challenge-csrf-token');
        expect(JSON.parse(String(init?.body))).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            code: '123456',
            language: 'es',
        });
        expect(auth.establishSession).toHaveBeenCalledTimes(1);
        expect(window.location.pathname).toBe('/mi-cuenta');
    });

    it('prepares and verifies MFA setup without putting the shared secret in the URL', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_challenge_csrf=challenge-csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'mfa-setup-ready',
            setup: {
                method: 'software-token',
                sharedSecret: 'ABCDEFGHIJKLMNOP',
                otpauthUri: 'otpauth://totp/example',
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        const setupResponse = await service.submit('startMfaSetup' as any, {});

        expect(setupResponse.status).toBe('mfa-setup-ready');
        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/session/mfa/setup', jasmine.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-CSRF': 'challenge-csrf-token',
            }),
        }));
        expect(window.location.href).not.toContain('ABCDEFGHIJKLMNOP');

        fetchSpy.calls.reset();
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'signed-in',
            session: {
                profile: { subject: 'user-123', roles: ['zoosite-client'] },
                provider: 'cognito',
                expiresAtEpochMs: 1999999999000,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        await service.submit('verifyMfaSetup' as any, {
            code: '654321',
        });

        const [verifyUrl, verifyInit] = fetchSpy.calls.argsFor(0);
        expect(String(verifyUrl)).toBe('/auth/session/mfa/verify');
        expect(verifyInit?.credentials).toBe('include');
        expect((verifyInit?.headers as Record<string, string>)['X-ZLP-CSRF']).toBe('challenge-csrf-token');
        expect(JSON.parse(String(verifyInit?.body))).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            code: '654321',
            language: 'es',
        });
        expect(auth.establishSession).toHaveBeenCalledTimes(1);
        expect(window.location.pathname).toBe('/mi-cuenta');
    });

    it('starts voluntary MFA enrollment with the active session CSRF and no browser tokens', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_csrf=session-csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'mfa-enrollment-ready',
            setup: {
                method: 'software-token',
                sharedSecret: 'ABCDEFGHIJKLMNOP',
                otpauthUri: 'otpauth://totp/example',
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        const setupResponse = await service.submit('startMfaEnrollment' as any, {
            password: 'ValidPass123!',
        });

        expect(setupResponse.status).toBe('mfa-enrollment-ready');
        const [url, init] = fetchSpy.calls.argsFor(0);
        expect(String(url)).toBe('/auth/session/mfa/enroll/start');
        expect(init?.credentials).toBe('include');
        expect((init?.headers as Record<string, string>)['X-ZLP-CSRF']).toBe('session-csrf-token');
        expect((init?.headers as Record<string, string>)['X-ZLP-Domain']).toBe('zoositioweb.com.mx');
        expect((init?.headers as Record<string, string>)['X-ZLP-Auth-Profile-Id']).toBe('staff');
        expect(JSON.parse(String(init?.body))).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            password: 'ValidPass123!',
            language: 'es',
        });
        expect(window.location.href).not.toContain('ABCDEFGHIJKLMNOP');
    });

    it('verifies voluntary MFA enrollment with enrollment CSRF and returns to account success', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_mfa_enroll_csrf=enroll-csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'mfa-enabled',
            account: {
                profile: { subject: 'user-123', roles: ['zoosite-client'] },
            },
            session: {
                profile: { subject: 'user-123', roles: ['zoosite-client'] },
                provider: 'cognito',
                expiresAtEpochMs: 1999999999000,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('verifyMfaEnrollment' as any, {
            code: '123456',
        });

        const [url, init] = fetchSpy.calls.argsFor(0);
        expect(String(url)).toBe('/auth/session/mfa/enroll/verify');
        expect(init?.credentials).toBe('include');
        expect((init?.headers as Record<string, string>)['X-ZLP-CSRF']).toBe('enroll-csrf-token');
        expect((init?.headers as Record<string, string>)['X-ZLP-Domain']).toBe('zoositioweb.com.mx');
        expect((init?.headers as Record<string, string>)['X-ZLP-Auth-Profile-Id']).toBe('staff');
        expect(JSON.parse(String(init?.body))).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            code: '123456',
            language: 'es',
        });
        expect(auth.establishSession).toHaveBeenCalledTimes(1);
        expect(window.location.pathname).toBe('/mi-cuenta');
        expect(window.location.search).toContain('authStatus=mfa-enabled');
    });

    it('disables MFA with session CSRF and returns to account success', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_csrf=session-csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            status: 'mfa-disabled',
            account: {
                profile: { subject: 'user-123', roles: ['zoosite-client'] },
            },
            session: {
                profile: { subject: 'user-123', roles: ['zoosite-client'] },
                provider: 'cognito',
                expiresAtEpochMs: 1999999999000,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        await service.submit('disableMfa' as any, {
            password: 'ValidPass123!',
            code: '123456',
        });

        const [url, init] = fetchSpy.calls.argsFor(0);
        expect(String(url)).toBe('/auth/session/mfa/disable');
        expect(init?.credentials).toBe('include');
        expect((init?.headers as Record<string, string>)['X-ZLP-CSRF']).toBe('session-csrf-token');
        expect((init?.headers as Record<string, string>)['X-ZLP-Domain']).toBe('zoositioweb.com.mx');
        expect((init?.headers as Record<string, string>)['X-ZLP-Auth-Profile-Id']).toBe('staff');
        expect(JSON.parse(String(init?.body))).toEqual({
            domain: 'zoositioweb.com.mx',
            authProfileId: 'staff',
            password: 'ValidPass123!',
            code: '123456',
            language: 'es',
        });
        expect(auth.establishSession).toHaveBeenCalledTimes(1);
        expect(window.location.pathname).toBe('/mi-cuenta');
        expect(window.location.search).toContain('authStatus=mfa-disabled');
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

    it('preserves server auth error codes for draft messaging', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: false,
            error: 'Account does not belong to this environment',
            errorCode: 'auth_environment_mismatch',
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthCustomFormService);

        try {
            await service.submit('respondMfaChallenge' as any, {
                code: '123456',
            });
            fail('Expected auth form request to fail.');
        } catch (error) {
            expect(error instanceof AuthCustomFormRequestError).toBeTrue();
            expect((error as AuthCustomFormRequestError).message).toBe('Account does not belong to this environment');
            expect((error as AuthCustomFormRequestError).code).toBe('auth_environment_mismatch');
        }
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
        expect(window.location.href).not.toContain('client@example.test');
        expect(window.location.href).not.toContain('123456');
        expect(window.location.href).not.toContain('654321');
        expect(window.location.href).not.toContain('NewStrongPassphrase123!');
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
