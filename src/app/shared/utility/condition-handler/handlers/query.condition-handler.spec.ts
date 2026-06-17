import { ALLOWED_CONDITION_IDS } from '@/app/shared/services/condition-orchestrator-allowlist';
import { queryEqConditionHandler } from './query.condition-handler';

describe('query condition handlers', () => {
    afterEach(() => {
        window.history.pushState({}, '', '/');
    });

    it('matches query parameter values without using runtime variables', () => {
        window.history.pushState({}, '', '/acceso?authStatus=account-confirmed&lang=es');

        expect(queryEqConditionHandler.resolve({ component: {} as any, host: null }, [
            'authStatus',
            'account-confirmed',
        ])).toBeTrue();
        expect(queryEqConditionHandler.resolve({ component: {} as any, host: null }, [
            'authStatus',
            'password-reset',
        ])).toBeFalse();
    });

    it('is allowlisted for draft component conditions', () => {
        expect(ALLOWED_CONDITION_IDS).toContain('queryEq');
    });
});
