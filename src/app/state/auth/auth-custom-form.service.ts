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
    | 'respondMfaChallenge'
    | 'startMfaSetup'
    | 'verifyMfaSetup'
    | 'startMfaEnrollment'
    | 'verifyMfaEnrollment'
    | 'logout';

type TAuthCustomFormNetworkAction = Exclude<TAuthCustomFormAction, 'logout'>;

export type TAuthCustomFormResponse = {
    readonly ok: boolean;
    readonly status?: string;
    readonly challengeName?: string;
    readonly error?: string;
    readonly delivery?: Readonly<Record<string, string>>;
    readonly setup?: Readonly<Record<string, string>>;
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
            await this.logoutServerSessionIfConfigured();
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
            if (response.status === 'challenge-required') {
                this.navigateAfterSigninChallenge(response.challengeName);
                return response;
            }
            const session = this.toStoredSession(response.session);
            if (!session) {
                throw new Error('Auth form response is invalid.');
            }
            this.auth.establishSession(session);
            this.navigateAfterSignin();
        } else if (action === 'respondMfaChallenge' || action === 'verifyMfaSetup' || action === 'verifyMfaEnrollment') {
            const session = this.toStoredSession(response.session);
            if (!session) {
                throw new Error('Auth form response is invalid.');
            }
            this.auth.establishSession(session);
            if (action === 'verifyMfaEnrollment') {
                this.navigateToFlowPath('mi-cuenta', '/mi-cuenta', 'mfa-enabled');
            } else {
                this.navigateAfterSignin();
            }
        } else if (action === 'startMfaSetup' || action === 'startMfaEnrollment') {
            return response;
        } else if (action === 'signup') {
            this.navigateAfterSignup();
        } else if (action === 'confirmSignup') {
            this.navigateAfterConfirmSignup();
        } else if (action === 'forgotPassword') {
            this.navigateAfterForgotPassword();
        } else if (action === 'confirmForgotPassword') {
            this.navigateAfterConfirmForgotPassword();
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

        if (action === 'startMfaSetup') {
            return {
                domain: context.domain,
                authProfileId: context.authProfileId,
                ...(language ? { language } : {}),
            };
        }

        if (action === 'startMfaEnrollment') {
            return {
                domain: context.domain,
                authProfileId: context.authProfileId,
                password: this.stringValue(context.values['password']),
                ...(language ? { language } : {}),
            };
        }

        if (action === 'respondMfaChallenge' || action === 'verifyMfaSetup' || action === 'verifyMfaEnrollment') {
            return {
                domain: context.domain,
                authProfileId: context.authProfileId,
                code: this.clean(context.values['code']),
                ...(language ? { language } : {}),
            };
        }

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
        const path = this.pathForAction(action);
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (this.isChallengeAction(action)) {
            headers[this.csrfHeaderName()] = this.challengeCsrfCookieValue();
        }
        if (action === 'startMfaEnrollment') {
            this.applySessionContextHeaders(headers);
            headers[this.csrfHeaderName()] = this.csrfCookieValue();
        }
        if (action === 'verifyMfaEnrollment') {
            this.applySessionContextHeaders(headers);
            headers[this.csrfHeaderName()] = this.mfaEnrollmentCsrfCookieValue();
        }
        const response = await fetch(this.buildUrl(path), {
            method: 'POST',
            headers,
            ...(this.isServerSessionPath(path) ? { credentials: 'include' as const } : {}),
            body: JSON.stringify(payload),
        });
        const body = await this.parseJson(response);
        if (!response.ok || body.ok === false) {
            throw new Error(this.clean(body.error) || 'Auth form request failed.');
        }
        return body;
    }

    private pathForAction(action: TAuthCustomFormNetworkAction): string {
        const serverSessionSigninPath = this.serverSessionPath('signinPath');
        const paths: Record<TAuthCustomFormNetworkAction, string> = {
            signin: serverSessionSigninPath || '/auth/signin',
            signup: '/auth/signup',
            confirmSignup: '/auth/confirm-signup',
            resendConfirmation: '/auth/resend-confirmation',
            forgotPassword: '/auth/forgot-password',
            confirmForgotPassword: '/auth/confirm-forgot-password',
            respondMfaChallenge: this.serverSessionPath('challengeRespondPath') || '/auth/session/challenge/respond',
            startMfaSetup: this.serverSessionPath('mfaSetupPath') || '/auth/session/mfa/setup',
            verifyMfaSetup: this.serverSessionPath('mfaVerifyPath') || '/auth/session/mfa/verify',
            startMfaEnrollment: this.serverSessionPath('mfaEnrollStartPath') || '/auth/session/mfa/enroll/start',
            verifyMfaEnrollment: this.serverSessionPath('mfaEnrollVerifyPath') || '/auth/session/mfa/enroll/verify',
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
        if (this.isServerSessionPath(path)) {
            return path;
        }
        return buildAuthEndpointUrl(path, this.request?.url);
    }

    private async logoutServerSessionIfConfigured(): Promise<void> {
        const logoutPath = this.serverSessionPath('logoutPath');
        if (!logoutPath) return;
        const context = this.authContext();
        if (!context) {
            throw new Error('Auth profile is unavailable.');
        }

        const response = await fetch(logoutPath, {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-ZLP-Domain': context.domain,
                'X-ZLP-Auth-Profile-Id': context.authProfileId,
                [this.csrfHeaderName()]: this.csrfCookieValue(),
            },
        });
        const body = await this.parseJson(response);
        if (!response.ok || body.ok === false) {
            throw new Error(this.clean(body.error) || 'Auth form request failed.');
        }
    }

    private isServerSessionPath(path: string): boolean {
        const sessionPaths = [
            this.serverSessionPath('signinPath'),
            this.serverSessionPath('mePath'),
            this.serverSessionPath('logoutPath'),
            this.serverSessionPath('challengeRespondPath'),
            this.serverSessionPath('mfaSetupPath'),
            this.serverSessionPath('mfaVerifyPath'),
            this.serverSessionPath('mfaEnrollStartPath'),
            this.serverSessionPath('mfaEnrollVerifyPath'),
        ].filter(Boolean);
        return sessionPaths.includes(path);
    }

    private isChallengeAction(action: TAuthCustomFormNetworkAction): boolean {
        return action === 'respondMfaChallenge'
            || action === 'startMfaSetup'
            || action === 'verifyMfaSetup';
    }

    private applySessionContextHeaders(headers: Record<string, string>): void {
        const context = this.authContext();
        if (!context) {
            throw new Error('Auth profile is unavailable.');
        }
        headers['X-ZLP-Domain'] = context.domain;
        headers['X-ZLP-Auth-Profile-Id'] = context.authProfileId;
    }

    private authContext(): { readonly domain: string; readonly authProfileId: string } | null {
        const domain = this.clean(this.configStore.siteConfig()?.domain).toLowerCase();
        const authProfileId = this.clean(this.runtimeConfig.auth()?.authProfileId);
        if (!domain || !authProfileId) {
            return null;
        }
        return { domain, authProfileId };
    }

    private serverSessionPath(key: 'signinPath' | 'mePath' | 'logoutPath' | 'challengeRespondPath' | 'mfaSetupPath' | 'mfaVerifyPath' | 'mfaEnrollStartPath' | 'mfaEnrollVerifyPath'): string {
        const session = this.runtimeConfig.auth()?.session;
        const value = session?.mode === 'server-cookie' ? session[key] : '';
        return this.safeSameOriginPath(value);
    }

    private csrfHeaderName(): string {
        return this.clean(this.runtimeConfig.auth()?.session?.csrfHeaderName) || 'X-ZLP-CSRF';
    }

    private csrfCookieValue(): string {
        const cookieName = this.clean(this.runtimeConfig.auth()?.session?.csrfCookieName) || 'zlp_csrf';
        return this.cookieValue(cookieName);
    }

    private challengeCsrfCookieValue(): string {
        const cookieName = this.clean(this.runtimeConfig.auth()?.session?.challengeCsrfCookieName) || 'zlp_challenge_csrf';
        return this.cookieValue(cookieName);
    }

    private mfaEnrollmentCsrfCookieValue(): string {
        const cookieName = this.clean(this.runtimeConfig.auth()?.session?.mfaEnrollCsrfCookieName) || 'zlp_mfa_enroll_csrf';
        return this.cookieValue(cookieName);
    }

    private cookieValue(cookieName: string): string {
        if (typeof document === 'undefined' || !document.cookie) {
            return '';
        }
        const match = document.cookie
            .split(';')
            .map((entry) => entry.trim())
            .map((entry) => entry.split('='))
            .find(([key]) => key === cookieName);
        return match?.[1] ?? '';
    }

    private navigateAfterSignin(): void {
        const path = this.resolvePostLoginPath(this.runtimeConfig.auth());
        if (!path) return;
        navigateInCurrentWindow(this.withStickyQueryParams(path), {
            scrollRestoration: { mode: 'top' },
        });
    }

    private navigateAfterSigninChallenge(challengeName: unknown): void {
        const normalized = this.clean(challengeName);
        if (normalized === 'SOFTWARE_TOKEN_MFA') {
            this.navigateToFlowPath('verificar-acceso', '/verificar-acceso', 'mfa-required');
            return;
        }
        if (normalized === 'MFA_SETUP') {
            this.navigateToFlowPath('configurar-mfa', '/configurar-mfa', 'mfa-setup-required');
            return;
        }
        throw new Error('Unsupported authentication challenge.');
    }

    private navigateAfterLogout(): void {
        const path = this.resolvePostLogoutPath(this.runtimeConfig.auth());
        if (!path) return;
        navigateInCurrentWindow(this.withStickyQueryParams(path), {
            scrollRestoration: { mode: 'top' },
        });
    }

    private navigateAfterSignup(): void {
        this.navigateToFlowPath('confirmar-cuenta', '/confirmar-cuenta', 'account-created');
    }

    private navigateAfterConfirmSignup(): void {
        this.navigateToLoginPath('account-confirmed');
    }

    private navigateAfterForgotPassword(): void {
        this.navigateToFlowPath('cambiar-contrasena', '/cambiar-contrasena', 'password-code-sent');
    }

    private navigateAfterConfirmForgotPassword(): void {
        this.navigateToLoginPath('password-reset');
    }

    private navigateToLoginPath(authStatus: string): void {
        const path = this.safeSameOriginPath(this.runtimeConfig.auth()?.loginPath) || '/acceso';
        this.navigateToPathWithAuthStatus(path, authStatus);
    }

    private navigateToFlowPath(pageId: string, fallbackPath: string, authStatus: string): void {
        const path = this.routePathByPageId(pageId) || fallbackPath;
        this.navigateToPathWithAuthStatus(path, authStatus);
    }

    private navigateToPathWithAuthStatus(path: string, authStatus: string): void {
        navigateInCurrentWindow(this.withStickyQueryParams(this.withAuthStatus(path, authStatus)), {
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

    private withAuthStatus(path: string, authStatus: string): string {
        try {
            const url = new URL(path, 'https://zoolanding.local');
            url.searchParams.set('authStatus', authStatus);
            return `${ url.pathname || '/' }${ url.search }${ url.hash }`;
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
