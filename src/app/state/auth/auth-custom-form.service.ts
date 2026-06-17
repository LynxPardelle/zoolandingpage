import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../shared/services/draft-runtime.service';
import type {
    TDraftAuthRuntimeConfig,
    TDraftSiteRouteEntry,
} from '../../shared/types/config-payloads.types';
import { navigateInCurrentWindow } from '../../shared/utility/navigation/browser-navigation.utility';
import { Injectable, REQUEST, inject } from '@angular/core';
import { ConfigStoreService } from '../../shared/services/config-store.service';
import { LanguageService } from '../../shared/services/language.service';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import { buildAuthEndpointUrl } from '../../shared/utility/auth/auth-api-url.utility';
import { AuthFacade } from './auth.facade';
import type { TStoredAuthSession } from './auth.models';

export type TAuthCustomFormAction =
    | 'signin'
    | 'signup'
    | 'confirmSignup'
    | 'resendConfirmation'
    | 'forgotPassword'
    | 'confirmForgotPassword'
    | 'logout';

type TAuthCustomFormNetworkAction = Exclude<TAuthCustomFormAction, 'logout'>;

export type TAuthCustomFormResponse = {
    readonly ok: boolean;
    readonly status?: string;
    readonly error?: string;
    readonly delivery?: Readonly<Record<string, string>>;
    readonly session?: unknown;
};

@Injectable({ providedIn: 'root' })
export class AuthCustomFormService {
    private readonly configStore = inject(ConfigStoreService);
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly language = inject(LanguageService);
    private readonly auth = inject(AuthFacade);
    private readonly request = inject(REQUEST, { optional: true });

    async submit(
        action: TAuthCustomFormAction,
        values: Readonly<Record<string, unknown>>,
    ): Promise<TAuthCustomFormResponse> {
        if (action === 'logout') {
            this.auth.requestSignOut();
            this.navigateAfterLogout();
            return { ok: true, status: 'signed-out' };
        }

        const domain = this.clean(this.configStore.siteConfig()?.domain);
        const authProfileId = this.clean(this.runtimeConfig.auth()?.authProfileId);
        if (!domain || !authProfileId) {
            throw new Error('Auth profile is unavailable.');
        }

        const response = await this.postAuth(action, this.payloadForAction(action, {
            domain,
            authProfileId,
            values,
        }));
        if (action === 'signin') {
            const session = this.toStoredSession(response.session);
            if (!session) {
                throw new Error('Auth form response is invalid.');
            }
            this.auth.establishSession(session);
            this.navigateAfterSignin();
        }
        return response;
    }

    private payloadForAction(
        action: TAuthCustomFormAction,
        context: {
            readonly domain: string;
            readonly authProfileId: string;
            readonly values: Readonly<Record<string, unknown>>;
        },
    ): Record<string, unknown> {
        const email = this.clean(context.values['email']);
        const language = this.clean(this.language.currentLanguage());

        if (action === 'forgotPassword' || action === 'resendConfirmation') {
            return {
                domain: context.domain,
                authProfileId: context.authProfileId,
                email,
                ...(language ? { language } : {}),
            };
        }

        if (action === 'confirmSignup') {
            return {
                domain: context.domain,
                authProfileId: context.authProfileId,
                email,
                code: this.clean(context.values['code']),
                ...(language ? { language } : {}),
            };
        }

        const password = this.stringValue(context.values['password']);
        const confirmPassword = this.stringValue(context.values['confirmPassword']);
        if (confirmPassword && password !== confirmPassword) {
            throw new Error('Passwords do not match.');
        }

        if (action === 'confirmForgotPassword') {
            return {
                domain: context.domain,
                authProfileId: context.authProfileId,
                email,
                code: this.clean(context.values['code']),
                password,
                ...(language ? { language } : {}),
            };
        }

        return {
            domain: context.domain,
            authProfileId: context.authProfileId,
            email,
            password,
            ...(language ? { language } : {}),
        };
    }

    private async postAuth(
        action: TAuthCustomFormNetworkAction,
        payload: Record<string, unknown>,
    ): Promise<TAuthCustomFormResponse> {
        const response = await fetch(this.buildUrl(this.pathForAction(action)), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const body = await this.parseJson(response);
        if (!response.ok || body.ok === false) {
            throw new Error(this.clean(body.error) || 'Auth form request failed.');
        }
        return body;
    }

    private pathForAction(action: TAuthCustomFormNetworkAction): string {
        const paths: Record<TAuthCustomFormNetworkAction, string> = {
            signin: '/auth/signin',
            signup: '/auth/signup',
            confirmSignup: '/auth/confirm-signup',
            resendConfirmation: '/auth/resend-confirmation',
            forgotPassword: '/auth/forgot-password',
            confirmForgotPassword: '/auth/confirm-forgot-password',
        };
        return paths[action];
    }

    private toStoredSession(value: unknown): TStoredAuthSession | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        const session = value as Record<string, unknown>;
        const profileValue = session['profile'];
        if (!profileValue || typeof profileValue !== 'object' || Array.isArray(profileValue)) {
            return null;
        }
        const profile = profileValue as Record<string, unknown>;
        const subject = this.clean(profile['subject']);
        const provider = this.clean(session['provider']);
        const expiresAtEpochMs = Number(session['expiresAtEpochMs']);
        if (!subject || !provider || !Number.isFinite(expiresAtEpochMs) || expiresAtEpochMs <= Date.now()) {
            return null;
        }

        const publicProfile: TStoredAuthSession['profile'] = {
            subject,
            roles: Array.isArray(profile['roles'])
                ? profile['roles'].map((role) => this.clean(role)).filter(Boolean)
                : [],
        };
        const displayName = this.clean(profile['displayName']);
        const email = this.clean(profile['email']);
        if (displayName) {
            (publicProfile as { displayName?: string }).displayName = displayName;
        }
        if (email) {
            (publicProfile as { email?: string }).email = email;
        }

        return {
            profile: publicProfile,
            provider,
            expiresAtEpochMs,
        };
    }

    private async parseJson(response: Response): Promise<TAuthCustomFormResponse> {
        const raw = await response.text();
        return raw ? JSON.parse(raw) as TAuthCustomFormResponse : { ok: response.ok };
    }

    private buildUrl(path: string): string {
        return buildAuthEndpointUrl(path, this.request?.url);
    }

    private navigateAfterSignin(): void {
        const path = this.resolvePostLoginPath(this.runtimeConfig.auth());
        if (!path) return;
        navigateInCurrentWindow(this.withStickyQueryParams(path), {
            scrollRestoration: { mode: 'top' },
        });
    }

    private navigateAfterLogout(): void {
        const path = this.resolvePostLogoutPath(this.runtimeConfig.auth());
        if (!path) return;
        navigateInCurrentWindow(this.withStickyQueryParams(path), {
            scrollRestoration: { mode: 'top' },
        });
    }

    private resolvePostLoginPath(profile: TDraftAuthRuntimeConfig | null): string {
        return this.safeSameOriginPath(profile?.postLoginPath)
            || this.routePathByPageId(profile?.accountPageId)
            || this.firstProtectedRouteForLogin(profile?.loginPath)
            || '/';
    }

    private resolvePostLogoutPath(profile: TDraftAuthRuntimeConfig | null): string {
        return this.safeSameOriginPath(profile?.postLogoutPath)
            || this.safeSameOriginPath(profile?.logoutPath)
            || this.safeSameOriginPath(profile?.loginPath)
            || '/';
    }

    private routePathByPageId(pageId: unknown): string {
        const targetPageId = this.clean(pageId);
        if (!targetPageId) return '';
        return this.configStore.siteConfig()?.routes
            ?.find((route) => route.pageId === targetPageId && this.safeSameOriginPath(route.path))
            ?.path ?? '';
    }

    private firstProtectedRouteForLogin(loginPath: unknown): string {
        const normalizedLoginPath = this.safeSameOriginPath(loginPath);
        return this.configStore.siteConfig()?.routes
            ?.find((route) => this.isLoginTargetProtectedRoute(route, normalizedLoginPath))
            ?.path ?? '';
    }

    private isLoginTargetProtectedRoute(route: TDraftSiteRouteEntry, normalizedLoginPath: string): boolean {
        return route.auth?.required === true
            && Boolean(this.safeSameOriginPath(route.path))
            && (
                !normalizedLoginPath
                || this.safeSameOriginPath(route.auth.redirectTo) === normalizedLoginPath
            );
    }

    private withStickyQueryParams(path: string): string {
        if (typeof window === 'undefined' || !window.location?.href) {
            return path;
        }

        try {
            const nextUrl = new URL(path, window.location.origin);
            const currentUrl = new URL(window.location.href);
            DRAFT_RUNTIME_STICKY_QUERY_PARAMS.forEach((key) => {
                if (!nextUrl.searchParams.has(key) && currentUrl.searchParams.has(key)) {
                    nextUrl.searchParams.set(key, currentUrl.searchParams.get(key) ?? '');
                }
            });
            return `${ nextUrl.pathname || '/' }${ nextUrl.search }${ nextUrl.hash }`;
        } catch {
            return path;
        }
    }

    private safeSameOriginPath(value: unknown): string {
        const path = this.clean(value);
        return path.length > 0
            && path.startsWith('/')
            && !path.startsWith('//')
            && !path.includes('\\')
            && !/[\s\u0000-\u001F\u007F]/.test(path)
            ? path
            : '';
    }

    private clean(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private stringValue(value: unknown): string {
        return typeof value === 'string' ? value : '';
    }
}
