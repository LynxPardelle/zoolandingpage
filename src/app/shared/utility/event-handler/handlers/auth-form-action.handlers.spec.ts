import { InteractionScopeService } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { AuthCustomFormService } from '@/app/state/auth/auth-custom-form.service';
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
