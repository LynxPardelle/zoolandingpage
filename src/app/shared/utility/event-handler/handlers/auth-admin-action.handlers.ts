import { AuthAdminClientService } from '@/app/state/auth/auth-admin-client.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

type TAuthAdminAction = 'approveUser' | 'setUserGroups' | 'suspendUser' | 'reactivateUser' | 'resetUserMfa';
type TAuthAdminStatusState = 'loading' | 'success' | 'error';

const ACTIONS = new Set<TAuthAdminAction>([
    'approveUser',
    'setUserGroups',
    'suspendUser',
    'reactivateUser',
    'resetUserMfa',
]);

const normalizeAction = (value: unknown): TAuthAdminAction | null => {
    const action = String(value ?? '').trim();
    return ACTIONS.has(action as TAuthAdminAction) ? action as TAuthAdminAction : null;
};

const groupsFromArg = (value: unknown): readonly string[] =>
    String(value ?? '')
        .split('|')
        .map((entry) => entry.trim())
        .filter(Boolean);

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : 'Auth admin action failed.';

const writeStatus = (
    variables: VariableStoreService,
    target: string,
    state: TAuthAdminStatusState,
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

export const authAdminActionHandler = (): EventHandler => {
    const authAdmin = inject(AuthAdminClientService);
    const variables = inject(VariableStoreService);

    return {
        id: 'authAdminAction',
        handle: async (_ctx, args) => {
            const action = normalizeAction(args?.[0]);
            if (!action) return;

            const subject = String(args?.[1] ?? '').trim();
            const statusTarget = String(args?.[3] || `authAdmin.${ action }`).trim();
            if (!subject) {
                writeStatus(variables, statusTarget, 'error', 'Auth admin action requires a user subject.');
                return;
            }

            writeStatus(variables, statusTarget, 'loading', null);
            try {
                const groups = groupsFromArg(args?.[2]);
                const response = await execute(authAdmin, action, subject, groups);
                await refreshAdminUsers(authAdmin, variables);
                writeStatus(variables, statusTarget, 'success', null, response);
            } catch (error) {
                writeStatus(variables, statusTarget, 'error', errorMessage(error));
            }
        },
    };
};

const execute = (
    authAdmin: AuthAdminClientService,
    action: TAuthAdminAction,
    subject: string,
    groups: readonly string[],
): Promise<unknown> => {
    if (action === 'approveUser') return authAdmin.approveUser(subject, groups.length ? groups : undefined);
    if (action === 'setUserGroups') return authAdmin.setUserGroups(subject, groups);
    if (action === 'suspendUser') return authAdmin.suspendUser(subject);
    if (action === 'resetUserMfa') return authAdmin.resetUserMfa(subject);
    return authAdmin.reactivateUser(subject);
};

const refreshAdminUsers = async (
    authAdmin: AuthAdminClientService,
    variables: VariableStoreService,
): Promise<void> => {
    try {
        const response = await authAdmin.listUsers();
        variables.setRuntimeValue('remote.auth.adminUsers', {
            items: response.users ?? [],
        });
        writeStatus(variables, 'remoteStatus.adminUsers', 'success', null, response);
    } catch (error) {
        writeStatus(variables, 'remoteStatus.adminUsers', 'error', errorMessage(error));
    }
};
