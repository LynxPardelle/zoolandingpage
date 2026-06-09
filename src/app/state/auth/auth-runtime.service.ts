import type {
    TDraftAuthRuntimeConfig,
    TDraftRouteAuthConfig,
    TDraftSiteRouteEntry,
} from '@/app/shared/types/config-payloads.types';
import { computed, inject, Injectable } from '@angular/core';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { AuthFacade } from './auth.facade';

export type TAuthRouteAccessReason =
    | 'public-route'
    | 'auth-disabled'
    | 'auth-required'
    | 'missing-group'
    | 'authenticated';

export type TAuthRouteAccessDecision = {
    readonly allowed: boolean;
    readonly reason: TAuthRouteAccessReason;
    readonly redirectTo: string | null;
    readonly requiredGroups: readonly string[];
};

@Injectable({ providedIn: 'root' })
export class AuthRuntimeService {
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly auth = inject(AuthFacade);

    readonly profile = computed<TDraftAuthRuntimeConfig | null>(() => this.runtimeConfig.auth());
    readonly enabled = computed(() => this.profile()?.enabled === true);

    isEnabled(): boolean {
        return this.enabled();
    }

    evaluateRouteAccess(route: TDraftSiteRouteEntry | null | undefined): TAuthRouteAccessDecision {
        const routeAuth = route?.auth;
        if (!routeAuth?.required) {
            return this.decision(true, 'public-route', null, []);
        }

        const requiredGroups = this.normalizeGroups(routeAuth.allowedGroups);
        const authProfile = this.profile();
        const redirectTo = this.resolveRedirectPath(routeAuth, authProfile);

        if (!authProfile?.enabled) {
            return this.decision(false, 'auth-disabled', redirectTo, requiredGroups);
        }

        if (!this.auth.isAuthenticated()) {
            return this.decision(false, 'auth-required', redirectTo, requiredGroups);
        }

        if (!this.auth.hasAnyGroup(requiredGroups)) {
            return this.decision(false, 'missing-group', redirectTo, requiredGroups);
        }

        return this.decision(true, 'authenticated', null, requiredGroups);
    }

    private resolveRedirectPath(
        routeAuth: TDraftRouteAuthConfig,
        authProfile: TDraftAuthRuntimeConfig | null,
    ): string | null {
        return this.cleanPath(routeAuth.redirectTo)
            || this.cleanPath(authProfile?.loginPath)
            || null;
    }

    private normalizeGroups(groups: readonly string[] | null | undefined): readonly string[] {
        return (groups ?? [])
            .map((group) => String(group ?? '').trim())
            .filter(Boolean);
    }

    private cleanPath(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private decision(
        allowed: boolean,
        reason: TAuthRouteAccessReason,
        redirectTo: string | null,
        requiredGroups: readonly string[],
    ): TAuthRouteAccessDecision {
        return {
            allowed,
            reason,
            redirectTo,
            requiredGroups,
        };
    }
}
