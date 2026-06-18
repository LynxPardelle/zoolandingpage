import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { ConfigStoreService } from '../../shared/services/config-store.service';
import { AuthAdminClientService } from './auth-admin-client.service';
import { REQUEST } from '@angular/core';

describe('AuthAdminClientService', () => {
    let fetchSpy: jasmine.Spy;

    beforeEach(() => {
        fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({
            ok: true,
            account: {
                subject: 'client-sub',
                email: 'client@example.test',
                roles: ['zoosite-client'],
                approvalStatus: 'pending',
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        TestBed.configureTestingModule({
            providers: [
                ConfigStoreService,
                RuntimeConfigService,
                AuthAdminClientService,
                { provide: REQUEST, useValue: new Request('https://zoositioweb.com.mx/admin/usuarios') },
            ],
        });

        TestBed.inject(ConfigStoreService).setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
                    hostedUiDomain: 'https://example.auth.us-east-1.amazoncognito.com',
                    clientId: 'public-client-id',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    session: {
                        mode: 'server-cookie',
                        signinPath: '/auth/session/signin',
                        mePath: '/auth/session/me',
                        logoutPath: '/auth/session/logout',
                        csrfCookieName: 'zlp_csrf',
                        csrfHeaderName: 'X-ZLP-CSRF',
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
            site: {},
        } as any);
    });

    afterEach(() => {
        delete (document as unknown as { cookie?: string }).cookie;
        TestBed.resetTestingModule();
    });

    it('reads the current account through same-origin credentials', async () => {
        const service = TestBed.inject(AuthAdminClientService);

        const response = await service.me();

        expect(response.account.subject).toBe('client-sub');
        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/session/me', jasmine.objectContaining({
            method: 'GET',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-Domain': 'zoositioweb.com.mx',
                'X-ZLP-Auth-Profile-Id': 'staff',
            }),
        }));
    });

    it('deduplicates concurrent account reads during private route bootstrap', async () => {
        let resolveMe!: (value: Response) => void;
        fetchSpy.and.returnValue(new Promise<Response>((resolve) => {
            resolveMe = resolve;
        }));
        const service = TestBed.inject(AuthAdminClientService);

        const first = service.me();
        const second = service.me();
        resolveMe(new Response(JSON.stringify({
            ok: true,
            account: {
                subject: 'client-sub',
                email: 'client@example.test',
                roles: ['zoosite-client'],
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const [firstResponse, secondResponse] = await Promise.all([first, second]);

        expect(firstResponse.account.subject).toBe('client-sub');
        expect(secondResponse.account.subject).toBe('client-sub');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back to the resolved host domain before site config domain is available', async () => {
        TestBed.inject(ConfigStoreService).setSiteConfig({
            version: 1,
            domain: '',
            routes: [],
            runtime: {
                auth: {
                    enabled: true,
                    authProfileId: 'staff',
                    provider: 'cognito',
                    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EXAMPLE',
                    hostedUiDomain: 'https://example.auth.us-east-1.amazoncognito.com',
                    clientId: 'public-client-id',
                    scopes: ['openid'],
                    redirectPath: '/auth/callback',
                    logoutPath: '/acceso',
                    session: {
                        mode: 'server-cookie',
                        signinPath: '/auth/session/signin',
                        mePath: '/auth/session/me',
                        logoutPath: '/auth/session/logout',
                    },
                },
            },
            site: {},
        } as any);
        const service = TestBed.inject(AuthAdminClientService);

        await service.me();

        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/session/me', jasmine.objectContaining({
            method: 'GET',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-Domain': 'zoositioweb.com.mx',
                'X-ZLP-Auth-Profile-Id': 'staff',
            }),
        }));
    });

    it('uses the remote auth profile id before public auth is installed', async () => {
        TestBed.inject(ConfigStoreService).setSiteConfig({
            version: 1,
            domain: 'zoositioweb.com.mx',
            routes: [],
            runtime: {
                authRemote: {
                    enabled: true,
                    authProfileId: 'staff',
                    endpoint: '/auth/runtime-config',
                },
            },
            site: {},
        } as any);
        const service = TestBed.inject(AuthAdminClientService);

        await service.me();

        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/session/me', jasmine.objectContaining({
            method: 'GET',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-Domain': 'zoositioweb.com.mx',
                'X-ZLP-Auth-Profile-Id': 'staff',
            }),
        }));
    });

    it('sends csrf-protected admin approve requests with encoded subject paths', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_csrf=csrf-token',
        });
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            user: { subject: 'client/sub', approvalStatus: 'approved' },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthAdminClientService);

        await service.approveUser('client/sub', ['zoosite-client']);

        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/admin/users/client%2Fsub/approve', jasmine.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-CSRF': 'csrf-token',
                'Content-Type': 'application/json',
                'X-ZLP-Domain': 'zoositioweb.com.mx',
                'X-ZLP-Auth-Profile-Id': 'staff',
            }),
            body: JSON.stringify({ groups: ['zoosite-client'] }),
        }));
    });

    it('uses same-origin credentials, draft context and csrf for every admin mutation', async () => {
        Object.defineProperty(document, 'cookie', {
            configurable: true,
            value: 'zlp_csrf=csrf-token',
        });
        fetchSpy.and.callFake(() => Promise.resolve(new Response(JSON.stringify({
            ok: true,
            user: { subject: 'client/sub', approvalStatus: 'approved' },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        })));
        const service = TestBed.inject(AuthAdminClientService);

        await service.setUserGroups('client/sub', ['zoosite-client']);
        await service.suspendUser('client/sub');
        await service.reactivateUser('client/sub');
        await service.resetUserMfa('client/sub');

        expect(fetchSpy.calls.allArgs().map(([url, init]) => ({
            url,
            method: init?.method,
            credentials: init?.credentials,
            headers: init?.headers,
            body: init?.body,
        }))).toEqual([
            {
                url: '/auth/admin/users/client%2Fsub/groups',
                method: 'POST',
                credentials: 'include',
                headers: jasmine.objectContaining({
                    'X-ZLP-CSRF': 'csrf-token',
                    'Content-Type': 'application/json',
                    'X-ZLP-Domain': 'zoositioweb.com.mx',
                    'X-ZLP-Auth-Profile-Id': 'staff',
                }) as unknown as HeadersInit,
                body: JSON.stringify({ groups: ['zoosite-client'] }),
            },
            {
                url: '/auth/admin/users/client%2Fsub/suspend',
                method: 'POST',
                credentials: 'include',
                headers: jasmine.objectContaining({
                    'X-ZLP-CSRF': 'csrf-token',
                    'Content-Type': 'application/json',
                    'X-ZLP-Domain': 'zoositioweb.com.mx',
                    'X-ZLP-Auth-Profile-Id': 'staff',
                }) as unknown as HeadersInit,
                body: JSON.stringify({}),
            },
            {
                url: '/auth/admin/users/client%2Fsub/reactivate',
                method: 'POST',
                credentials: 'include',
                headers: jasmine.objectContaining({
                    'X-ZLP-CSRF': 'csrf-token',
                    'Content-Type': 'application/json',
                    'X-ZLP-Domain': 'zoositioweb.com.mx',
                    'X-ZLP-Auth-Profile-Id': 'staff',
                }) as unknown as HeadersInit,
                body: JSON.stringify({}),
            },
            {
                url: '/auth/admin/users/client%2Fsub/mfa/reset',
                method: 'POST',
                credentials: 'include',
                headers: jasmine.objectContaining({
                    'X-ZLP-CSRF': 'csrf-token',
                    'Content-Type': 'application/json',
                    'X-ZLP-Domain': 'zoositioweb.com.mx',
                    'X-ZLP-Auth-Profile-Id': 'staff',
                }) as unknown as HeadersInit,
                body: JSON.stringify({}),
            },
        ]);
    });

    it('lists users with same-origin credentials and draft context', async () => {
        fetchSpy.and.resolveTo(new Response(JSON.stringify({
            ok: true,
            users: [{ subject: 'client-sub' }],
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));
        const service = TestBed.inject(AuthAdminClientService);

        const response = await service.listUsers();

        expect(response.users).toEqual([jasmine.objectContaining({ subject: 'client-sub' })]);
        expect(fetchSpy).toHaveBeenCalledOnceWith('/auth/admin/users', jasmine.objectContaining({
            method: 'GET',
            credentials: 'include',
            headers: jasmine.objectContaining({
                'X-ZLP-Domain': 'zoositioweb.com.mx',
                'X-ZLP-Auth-Profile-Id': 'staff',
            }),
        }));
    });
});
