import { AuthAdminClientService } from '@/app/state/auth/auth-admin-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { authAdminActionHandler } from './auth-admin-action.handlers';

describe('authAdminActionHandler', () => {
    let authAdmin: jasmine.SpyObj<AuthAdminClientService>;
    let variables: VariableStoreService;
    let context: EventExecutionContext;

    beforeEach(() => {
        authAdmin = jasmine.createSpyObj<AuthAdminClientService>('AuthAdminClientService', [
            'approveUser',
            'setUserGroups',
            'suspendUser',
            'reactivateUser',
            'resetUserMfa',
            'listUsers',
        ]);

        TestBed.configureTestingModule({
            providers: [
                VariableStoreService,
                { provide: AuthAdminClientService, useValue: authAdmin },
            ],
        });
        variables = TestBed.inject(VariableStoreService);
        context = {
            event: {
                componentId: 'approve-user-button',
                eventName: 'click',
            },
            host: {},
        };
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('approves users and writes status through generic event instructions', async () => {
        authAdmin.approveUser.and.resolveTo({
            ok: true,
            user: { subject: 'client-sub', approvalStatus: 'approved' },
        } as any);
        authAdmin.listUsers.and.resolveTo({
            ok: true,
            users: [
                { subject: 'client-sub', approvalStatus: 'approved' },
            ],
        } as any);

        const handler = TestBed.runInInjectionContext(() => authAdminActionHandler());
        await handler.handle(context, ['approveUser', 'client-sub', 'zoosite-client|zoosite-admin', 'remoteStatus.admin.client-sub']);

        expect(authAdmin.approveUser).toHaveBeenCalledOnceWith('client-sub', ['zoosite-client', 'zoosite-admin']);
        expect(authAdmin.listUsers).toHaveBeenCalledOnceWith();
        expect(variables.get('remote.auth.adminUsers.items')).toEqual([
            jasmine.objectContaining({ subject: 'client-sub', approvalStatus: 'approved' }),
        ]);
        expect(variables.get('remoteStatus.admin.client-sub.state')).toBe('success');
        expect(variables.get('remoteStatus.admin.client-sub.data')).toEqual(jasmine.objectContaining({
            ok: true,
        }));
    });

    it('rejects missing subject without calling the backend', async () => {
        const handler = TestBed.runInInjectionContext(() => authAdminActionHandler());
        await handler.handle(context, ['approveUser']);

        expect(authAdmin.approveUser).not.toHaveBeenCalled();
        expect(variables.get('authAdmin.approveUser.state')).toBe('error');
    });

    it('resets user MFA through generic event instructions', async () => {
        authAdmin.resetUserMfa.and.resolveTo({
            ok: true,
            status: 'mfa-reset',
            user: { subject: 'client-sub', approvalStatus: 'approved' },
        } as any);
        authAdmin.listUsers.and.resolveTo({
            ok: true,
            users: [
                { subject: 'client-sub', approvalStatus: 'approved' },
            ],
        } as any);

        const handler = TestBed.runInInjectionContext(() => authAdminActionHandler());
        await handler.handle(context, ['resetUserMfa', 'client-sub', '', 'remoteStatus.admin.client-sub']);

        expect(authAdmin.resetUserMfa).toHaveBeenCalledOnceWith('client-sub');
        expect(authAdmin.listUsers).toHaveBeenCalledOnceWith();
        expect(variables.get('remoteStatus.admin.client-sub.state')).toBe('success');
        expect(variables.get('remoteStatus.admin.client-sub.data')).toEqual(jasmine.objectContaining({
            status: 'mfa-reset',
        }));
    });
});
