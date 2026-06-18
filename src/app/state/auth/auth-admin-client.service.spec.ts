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
});
