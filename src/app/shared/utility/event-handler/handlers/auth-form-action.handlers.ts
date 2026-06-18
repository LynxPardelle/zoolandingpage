import { findInteractionScopeHost } from '@/app/shared/components/interaction-scope/interaction-scope.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { AuthCustomFormService, type TAuthCustomFormAction } from '@/app/state/auth/auth-custom-form.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

type TAuthFormStatusState = 'loading' | 'success' | 'error';

const AUTH_FORM_ACTIONS = new Set<TAuthCustomFormAction>([
    'signin',
    'signup',
    'confirmSignup',
    'resendConfirmation',
    'forgotPassword',
    'confirmForgotPassword',
    'respondMfaChallenge',
    'startMfaSetup',
    'verifyMfaSetup',
    'logout',
]);

const normalizeAction = (value: unknown): TAuthCustomFormAction | null => {
    const action = typeof value === 'string' ? value.trim() : '';
    return AUTH_FORM_ACTIONS.has(action as TAuthCustomFormAction)
        ? action as TAuthCustomFormAction
        : null;
};

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'Auth form request failed.';

const writeStatus = (
    variables: VariableStoreService,
    target: string,
    state: TAuthFormStatusState,
    error: string | null,
    data?: unknown,
): void => {
    variables.setRuntimeValue(target, {
        state,
        updatedAt: state === 'loading' ? null : new Date().toISOString(),
        error,
        ...(state === 'success' ? { data } : {}),
    });
};

export const authFormActionHandler = (): EventHandler => {
    const authForms = inject(AuthCustomFormService);
    const variables = inject(VariableStoreService);

    return {
        id: 'authFormAction',
        handle: async (ctx, args) => {
            const action = normalizeAction(args?.[0]);
            if (!action) return;

            const statusTarget = String(args?.[1] || `authForm.${ action }`).trim();
            if (action === 'logout' || action === 'startMfaSetup') {
                writeStatus(variables, statusTarget, 'loading', null);
                try {
                    const response = await authForms.submit(action, {});
                    writeStatus(variables, statusTarget, 'success', null, response);
                } catch (error) {
                    writeStatus(variables, statusTarget, 'error', errorMessage(error));
                }
                return;
            }

            const host = findInteractionScopeHost(ctx.host);
            if (!host) {
                writeStatus(variables, statusTarget, 'error', 'Auth form scope is unavailable.');
                return;
            }

            const snapshot = host.submitInteractionScope?.() ?? host.interactionScope.submit();
            if (!snapshot.valid) {
                writeStatus(variables, statusTarget, 'error', 'Auth form is invalid.');
                return;
            }

            writeStatus(variables, statusTarget, 'loading', null);
            try {
                const response = await authForms.submit(action, snapshot.values);
                writeStatus(variables, statusTarget, 'success', null, response);
            } catch (error) {
                writeStatus(variables, statusTarget, 'error', errorMessage(error));
            }
        },
    };
};
