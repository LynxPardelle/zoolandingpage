import { InteractionScopeService } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { AuthCustomFormRequestError, AuthCustomFormService } from '@/app/state/auth/auth-custom-form.service';
import { TestBed } from '@angular/core/testing';
import type { EventExecutionContext } from '../event-handler.types';
import { authFormActionHandler } from './auth-form-action.handlers';

describe('authFormActionHandler', () => {
    let authForms: jasmine.SpyObj<AuthCustomFormService>;
    let variables: VariableStoreService;
    let scope: InteractionScopeService;
    let context: EventExecutionContext;

    beforeEach(() => {
        authForms = jasmine.createSpyObj<AuthCustomFormService>('AuthCustomFormService', ['submit']);

        TestBed.configureTestingModule({
            providers: [
                InteractionScopeService,
                VariableStoreService,
                { provide: AuthCustomFormService, useValue: authForms },
            ],
        });

        variables = TestBed.inject(VariableStoreService);
        scope = TestBed.inject(InteractionScopeService);
        scope.configure({ scopeId: 'signup-form' });
        scope.registerField({ fieldId: 'email', required: true });
        scope.registerField({ fieldId: 'password', required: true });
        scope.setFieldValue('email', 'client@example.test');
        scope.setFieldValue('password', 'StrongPassphrase123!');

        context = {
            event: {
                componentId: 'signupButton',
                eventName: 'click',
            },
            host: {
                scopeId: 'signup-form',
                interactionScope: scope,
            },
        };
    });

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('submits the nearest interaction scope through the custom auth form service', async () => {
        authForms.submit.and.resolveTo({ ok: true, status: 'confirmation-required' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['signup']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('signup', jasmine.objectContaining({
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
        }));
        expect(variables.get('authForm.signup.state')).toBe('success');
        expect(variables.get('authForm.signup.error')).toBeNull();
        expect(variables.get('authForm.signup.data')).toEqual({ ok: true, status: 'confirmation-required' });
    });

    it('does not submit invalid scopes', async () => {
        scope.setFieldValue('email', '');

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['signup']);

        expect(authForms.submit).not.toHaveBeenCalled();
        expect(variables.get('authForm.signup.state')).toBe('error');
    });

    it('supports custom auth confirmation and reset actions from generic draft components', async () => {
        authForms.submit.and.resolveTo({ ok: true, status: 'confirmed' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['confirmSignup', 'authForm.confirmSignup']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('confirmSignup' as any, jasmine.objectContaining({
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
        }));
        expect(variables.get('authForm.confirmSignup.state')).toBe('success');
    });

    it('supports custom signin from generic draft components', async () => {
        authForms.submit.and.resolveTo({ ok: true, status: 'signed-in' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['signin']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('signin' as any, jasmine.objectContaining({
            email: 'client@example.test',
            password: 'StrongPassphrase123!',
        }));
        expect(variables.get('authForm.signin.state')).toBe('success');
    });

    it('supports voluntary MFA enrollment start from generic draft components', async () => {
        authForms.submit.and.resolveTo({ ok: true, status: 'mfa-enrollment-ready' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['startMfaEnrollment', 'authForm.startMfaEnrollment']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('startMfaEnrollment' as any, jasmine.objectContaining({
            password: 'StrongPassphrase123!',
        }));
        expect(variables.get('authForm.startMfaEnrollment.state')).toBe('success');
        expect(variables.get('authForm.startMfaEnrollment.data')).toEqual({ ok: true, status: 'mfa-enrollment-ready' });
    });

    it('supports voluntary MFA enrollment verification from generic draft components', async () => {
        scope.registerField({ fieldId: 'code', required: true });
        scope.setFieldValue('code', '123456');
        authForms.submit.and.resolveTo({ ok: true, status: 'mfa-enabled' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['verifyMfaEnrollment', 'authForm.verifyMfaEnrollment']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('verifyMfaEnrollment' as any, jasmine.objectContaining({
            code: '123456',
        }));
        expect(variables.get('authForm.verifyMfaEnrollment.state')).toBe('success');
        expect(variables.get('authForm.verifyMfaEnrollment.data')).toEqual({ ok: true, status: 'mfa-enabled' });
    });

    it('supports MFA disable from generic draft components', async () => {
        scope.registerField({ fieldId: 'code', required: true });
        scope.setFieldValue('code', '123456');
        authForms.submit.and.resolveTo({ ok: true, status: 'mfa-disabled' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['disableMfa', 'authForm.disableMfa']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('disableMfa' as any, jasmine.objectContaining({
            password: 'StrongPassphrase123!',
            code: '123456',
        }));
        expect(variables.get('authForm.disableMfa.state')).toBe('success');
        expect(variables.get('authForm.disableMfa.data')).toEqual({ ok: true, status: 'mfa-disabled' });
    });

    it('writes a loading status before the custom auth request resolves', async () => {
        let resolveSubmit!: (value: { ok: true; status: string }) => void;
        authForms.submit.and.returnValue(new Promise((resolve) => {
            resolveSubmit = resolve;
        }));

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        const pending = handler.handle(context, ['signin']);

        expect(variables.get('authForm.signin.state')).toBe('loading');
        expect(variables.get('authForm.signin.updatedAt')).toBeNull();
        expect(variables.get('authForm.signin.error')).toBeNull();

        resolveSubmit({ ok: true, status: 'signed-in' });
        await pending;

        expect(variables.get('authForm.signin.state')).toBe('success');
    });

    it('ignores repeated submits while the same auth action is already loading', async () => {
        let resolveSubmit!: (value: { ok: true; status: string }) => void;
        authForms.submit.and.returnValue(new Promise((resolve) => {
            resolveSubmit = resolve;
        }));

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        const firstSubmit = handler.handle(context, ['signin']);
        const secondSubmit = handler.handle(context, ['signin']);

        expect(authForms.submit).toHaveBeenCalledTimes(1);
        expect(variables.get('authForm.signin.state')).toBe('loading');

        await secondSubmit;
        resolveSubmit({ ok: true, status: 'signed-in' });
        await firstSubmit;

        expect(variables.get('authForm.signin.state')).toBe('success');
    });

    it('stores auth form error codes for draft-level messaging', async () => {
        authForms.submit.and.rejectWith(new AuthCustomFormRequestError(
            'Account does not belong to this environment',
            'auth_environment_mismatch',
        ));

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle(context, ['respondMfaChallenge', 'authForm.respondMfaChallenge']);

        expect(variables.get('authForm.respondMfaChallenge.state')).toBe('error');
        expect(variables.get('authForm.respondMfaChallenge.error')).toBe('Account does not belong to this environment');
        expect(variables.get('authForm.respondMfaChallenge.errorCode')).toBe('auth_environment_mismatch');
    });

    it('supports custom logout without requiring an interaction scope', async () => {
        authForms.submit.and.resolveTo({ ok: true, status: 'signed-out' });

        const handler = TestBed.runInInjectionContext(() => authFormActionHandler());
        await handler.handle({
            event: {
                componentId: 'logoutButton',
                eventName: 'click',
            },
            host: null as any,
        }, ['logout', 'authForm.logout']);

        expect(authForms.submit).toHaveBeenCalledOnceWith('logout' as any, {});
        expect(variables.get('authForm.logout.state')).toBe('success');
        expect(variables.get('authForm.logout.data')).toEqual({ ok: true, status: 'signed-out' });
    });
});
