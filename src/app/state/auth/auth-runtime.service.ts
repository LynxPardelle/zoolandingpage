import type {
    TDraftAuthRuntimeConfig,
    TDraftRouteAuthConfig,
    TDraftSiteRouteEntry,
} from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { AuthAdminClientService, type TAuthAdminAccount } from './auth-admin-client.service';
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
    private readonly authAdmin = inject(AuthAdminClientService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

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

    async evaluateRouteAccessAsync(route: TDraftSiteRouteEntry | null | undefined): Promise<TAuthRouteAccessDecision> {
        const decision = this.evaluateRouteAccess(route);
        if (!this.shouldRevalidateWithServerCookie(route)) {
            return decision;
        }

        const deniedFallback = decision.allowed
            ? this.decision(
                false,
                'auth-required',
                route?.auth ? this.resolveRedirectPath(route.auth, this.profile()) : decision.redirectTo,
                decision.requiredGroups,
            )
            : decision;

        try {
            const response = await this.authAdmin.me();
            const account = response.account;
            if (!account?.subject) {
                this.auth.requestSignOut();
                return deniedFallback;
            }

            this.auth.establishSession({
                profile: {
                    subject: account.subject,
                    ...(account.email ? { email: account.email } : {}),
                    roles: account.roles ?? [],
                },
                provider: this.profile()?.provider ?? 'server-cookie',
                // Browser storage is editable UX metadata only. Server-cookie routes
                // revalidate against the BFF before rendering protected draft pages.
                expiresAtEpochMs: Date.now() + 5 * 60 * 1000,
            });
            return this.serverCookieDecision(account, deniedFallback);
        } catch {
            this.auth.requestSignOut();
            return this.decision(false, 'auth-required', deniedFallback.redirectTo, deniedFallback.requiredGroups);
        }
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

    private shouldRevalidateWithServerCookie(route: TDraftSiteRouteEntry | null | undefined): boolean {
        if (!this.isBrowser || route?.auth?.required !== true) {
            return false;
        }
        if (this.profile()?.session?.mode === 'server-cookie') {
            return true;
        }
        const remoteAuth = this.runtimeConfig.authRemote();
        return remoteAuth?.enabled === true && !!this.cleanPath(remoteAuth.authProfileId);
    }

    private serverCookieDecision(
        account: TAuthAdminAccount,
        fallback: TAuthRouteAccessDecision,
    ): TAuthRouteAccessDecision {
        if (account.enabled === false) {
            return this.decision(false, 'auth-required', fallback.redirectTo, fallback.requiredGroups);
        }
        if (!this.hasAnyGroup(account.roles, fallback.requiredGroups)) {
            return this.decision(false, 'missing-group', fallback.redirectTo, fallback.requiredGroups);
        }
        return this.decision(true, 'authenticated', null, fallback.requiredGroups);
    }

    private hasAnyGroup(
        roles: readonly string[] | null | undefined,
        requiredGroups: readonly string[],
    ): boolean {
        if (requiredGroups.length === 0) return true;
        const normalizedRoles = new Set(
            (roles ?? [])
                .map((role) => String(role ?? '').trim())
                .filter(Boolean),
        );
        return requiredGroups.some((group) => normalizedRoles.has(group));
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
