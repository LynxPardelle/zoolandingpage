import { AuthBrowserFlowService } from '@/app/state/auth/auth-browser-flow.service';
import { inject } from '@angular/core';
import { navigateInCurrentWindow } from '../../navigation/browser-navigation.utility';
import type { EventHandler } from '../event-handler.types';

type TAuthAction = 'login' | 'signup' | 'forgotPassword' | 'logout';

const AUTH_ACTIONS = new Set<TAuthAction>(['login', 'signup', 'forgotPassword', 'logout']);

export const authActionHandler = (): EventHandler => {
    const authFlow = inject(AuthBrowserFlowService);

    return {
        id: 'authAction',
        handle: async (_ctx, args) => {
            const action = normalizeAuthAction(args?.[0]);
            if (!action) {
                return;
            }

            const url = action === 'logout'
                ? authFlow.createLogoutUrl()
                : await authFlow.createInteractiveUrl(action);

            if (!url || typeof window === 'undefined') {
                return;
            }

            if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
                window.location.assign(url);
                return;
            }

            navigateInCurrentWindow(url);
        },
    };
};

function normalizeAuthAction(value: unknown): TAuthAction | null {
    const action = typeof value === 'string' ? value.trim() : '';
    return AUTH_ACTIONS.has(action as TAuthAction) ? action as TAuthAction : null;
}
