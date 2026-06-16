import { ConfigStoreService } from '@/app/shared/services/config-store.service';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '@/app/shared/services/draft-runtime.service';
import { LanguageService } from '@/app/shared/services/language.service';
import { RuntimeConfigService } from '@/app/shared/services/runtime-config.service';
import type { TDraftAuthRuntimeConfig } from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { AuthFacade } from './auth.facade';
import { AuthOidcService, type TAuthTokenExchangeResult } from './auth-oidc.service';
import type { TStoredAuthSession } from './auth.models';

type TAuthInteractiveAction = 'login' | 'signup' | 'forgotPassword';

type TAuthPkceTransaction = {
    readonly version: 1;
    readonly action: TAuthInteractiveAction;
    readonly authProfileId: string;
    readonly state: string;
    readonly codeVerifier: string;
    readonly redirectUri: string;
    readonly createdAtEpochMs: number;
};

export type TAuthCallbackHandlingResult = {
    readonly handled: boolean;
    readonly redirectTo: string | null;
    readonly reason:
        | 'not-browser'
        | 'not-callback-route'
        | 'missing-profile'
        | 'no-callback-params'
        | 'provider-error'
        | 'missing-transaction'
        | 'stale-transaction'
        | 'state-mismatch'
        | 'profile-mismatch'
        | 'token-exchange-failed'
        | 'invalid-session'
        | 'authenticated';
};

const AUTH_PKCE_STORAGE_KEY = 'zlp.auth.pkceTransaction.v1';
const PKCE_TRANSACTION_TTL_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthBrowserFlowService {
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly configStore = inject(ConfigStoreService);
    private readonly auth = inject(AuthFacade);
    private readonly oidc = inject(AuthOidcService);
    private readonly language = inject(LanguageService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);

    async createInteractiveUrl(action: TAuthInteractiveAction): Promise<string | null> {
        if (!this.isBrowser) {
            return null;
        }

        const profile = this.runtimeConfig.auth();
        const origin = this.currentOrigin();
        if (!profile?.enabled || !origin) {
            this.auth.fail('auth-profile-unavailable');
            return null;
        }

        const transaction = await this.createPkceTransaction(profile.authProfileId, action);
        if (!transaction) {
            this.auth.fail('auth-pkce-unavailable');
            return null;
        }

        const options = {
            origin,
            state: transaction.state,
            codeChallenge: await this.createCodeChallenge(transaction.codeVerifier),
            redirectUri: transaction.redirectUri,
            language: this.language.currentLanguage(),
        };
        const url = action === 'signup'
            ? this.oidc.buildSignupUrl(profile, options)
            : action === 'forgotPassword'
                ? this.oidc.buildForgotPasswordUrl(profile, options)
                : this.oidc.buildLoginUrl(profile, options);

        if (!url) {
            this.auth.fail('auth-url-unavailable');
            return null;
        }

        if (!this.writeTransaction(transaction)) {
            this.clearTransaction();
            this.auth.fail('auth-transaction-unavailable');
            return null;
        }

        this.auth.requestSignIn(profile.provider);
        return url;
    }

    createLogoutUrl(): string | null {
        if (!this.isBrowser) {
            return null;
        }

        const profile = this.runtimeConfig.auth();
        const origin = this.currentOrigin();
        this.clearTransaction();
        this.auth.requestSignOut();

        if (!profile?.enabled || !origin) {
            return this.resolvePostLogoutPath(profile);
        }

        return this.oidc.buildLogoutUrl(profile, {
            origin,
            logoutUri: this.resolveCurrentSameOriginUrl(this.resolvePostLogoutPath(profile)),
        })
            ?? this.resolvePostLogoutPath(profile);
    }

    async completeCallbackFromCurrentUrl(): Promise<TAuthCallbackHandlingResult> {
        if (!this.isBrowser || typeof window === 'undefined') {
            return this.result(false, null, 'not-browser');
        }

        return this.completeCallbackFromUrl(window.location.href);
    }

    async completeCallbackFromUrl(url: string): Promise<TAuthCallbackHandlingResult> {
        if (!this.isBrowser) {
            return this.result(false, null, 'not-browser');
        }

        const profile = this.runtimeConfig.auth();
        if (!profile?.enabled) {
            return this.result(false, null, 'missing-profile');
        }

        if (!this.isCallbackRoute(url, profile.redirectPath)) {
            return this.result(false, null, 'not-callback-route');
        }

        const callback = this.oidc.parseCallbackUrl(url);
        if (callback.error) {
            this.clearTransaction();
            this.auth.fail('auth-provider-error');
            return this.callbackFailureResult(profile, 'provider-error');
        }

        if (!callback.code || !callback.state) {
            return this.result(false, null, 'no-callback-params');
        }

        const transaction = this.readTransaction();
        if (!transaction) {
            this.auth.fail('auth-transaction-missing');
            return this.callbackFailureResult(profile, 'missing-transaction');
        }

        if (Date.now() - transaction.createdAtEpochMs > PKCE_TRANSACTION_TTL_MS) {
            this.clearTransaction();
            this.auth.fail('auth-transaction-expired');
            return this.callbackFailureResult(profile, 'stale-transaction');
        }

        if (transaction.state !== callback.state) {
            this.clearTransaction();
            this.auth.fail('auth-state-mismatch');
            return this.callbackFailureResult(profile, 'state-mismatch');
        }

        if (transaction.authProfileId !== profile.authProfileId) {
            this.clearTransaction();
            this.auth.fail('auth-profile-mismatch');
            return this.callbackFailureResult(profile, 'profile-mismatch');
        }

        const exchange = await this.exchangeAuthorizationCode(profile, {
            code: callback.code,
            codeVerifier: transaction.codeVerifier,
            redirectUri: transaction.redirectUri,
        });
        if (!exchange) {
            this.clearTransaction();
            this.auth.fail('auth-token-exchange-failed');
            return this.callbackFailureResult(profile, 'token-exchange-failed');
        }

        const session = this.toPublicSession(profile, exchange);
        if (!session) {
            this.clearTransaction();
            this.auth.fail('auth-session-invalid');
            return this.callbackFailureResult(profile, 'invalid-session');
        }

        this.clearTransaction();
        this.auth.establishSession(session);
        return this.result(true, this.resolvePostLoginPath(profile), 'authenticated');
    }

    private async createPkceTransaction(
        authProfileId: string,
        action: TAuthInteractiveAction,
    ): Promise<TAuthPkceTransaction | null> {
        const codeVerifier = this.randomBase64Url(32);
        const state = this.randomBase64Url(32);
        const redirectUri = this.resolveCurrentSameOriginUrl(this.runtimeConfig.auth()?.redirectPath);
        if (!codeVerifier || !state || !redirectUri || !await this.createCodeChallenge(codeVerifier)) {
            return null;
        }

        return {
            version: 1,
            action,
            authProfileId,
            state,
            codeVerifier,
            redirectUri,
            createdAtEpochMs: Date.now(),
        };
    }

    private async createCodeChallenge(codeVerifier: string): Promise<string> {
        const cryptoApi = this.cryptoApi();
        if (!cryptoApi?.subtle || typeof TextEncoder === 'undefined') {
            return '';
        }

        try {
            const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
            return this.base64UrlEncode(new Uint8Array(digest));
        } catch {
            return '';
        }
    }

    private randomBase64Url(byteLength: number): string {
        const cryptoApi = this.cryptoApi();
        if (!cryptoApi?.getRandomValues) {
            return '';
        }

        const bytes = new Uint8Array(byteLength);
        cryptoApi.getRandomValues(bytes);
        return this.base64UrlEncode(bytes);
    }

    private base64UrlEncode(bytes: Uint8Array): string {
        if (typeof btoa !== 'function') {
            return '';
        }

        let binary = '';
        bytes.forEach((byte) => {
            binary += String.fromCharCode(byte);
        });

        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }

    private cryptoApi(): Crypto | null {
        return typeof crypto !== 'undefined' ? crypto : null;
    }

    private async exchangeAuthorizationCode(
        profile: TDraftAuthRuntimeConfig,
        options: Pick<Parameters<AuthOidcService['exchangeAuthorizationCode']>[1], 'code' | 'codeVerifier' | 'redirectUri'>,
    ): Promise<TAuthTokenExchangeResult | null> {
        try {
            return await this.oidc.exchangeAuthorizationCode(profile, {
                origin: this.currentOrigin() ?? '',
                ...options,
            });
        } catch {
            return null;
        }
    }

    private writeTransaction(transaction: TAuthPkceTransaction): boolean {
        const payload = JSON.stringify(transaction);

        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(AUTH_PKCE_STORAGE_KEY, payload);
                if (sessionStorage.getItem(AUTH_PKCE_STORAGE_KEY) === payload) {
                    this.clearTransactionCookie();
                    return true;
                }
            }
        } catch {
            // Storage can be unavailable in private browsing or embedded contexts.
        }

        return this.writeTransactionCookie(payload);
    }

    private readTransaction(): TAuthPkceTransaction | null {
        try {
            if (typeof sessionStorage !== 'undefined') {
                const parsed = this.parseTransaction(sessionStorage.getItem(AUTH_PKCE_STORAGE_KEY));
                if (parsed) {
                    return parsed;
                }
            }
        } catch {
            // Storage can be unavailable in private browsing or embedded contexts.
        }

        return this.readTransactionCookie();
    }

    private clearTransaction(): void {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(AUTH_PKCE_STORAGE_KEY);
            }
        } catch {
            // Storage can be unavailable in private browsing or embedded contexts.
        }

        this.clearTransactionCookie();
    }

    private toPublicSession(
        profile: TDraftAuthRuntimeConfig,
        exchange: TAuthTokenExchangeResult,
    ): TStoredAuthSession | null {
        const subject = this.clean(exchange.claims['sub']);
        if (!subject || exchange.expiresAtEpochMs <= Date.now()) {
            return null;
        }

        return {
            profile: {
                subject,
                displayName: this.clean(exchange.claims['name']) || this.clean(exchange.claims['preferred_username']) || undefined,
                email: this.clean(exchange.claims['email']) || undefined,
                roles: this.normalizeGroups(exchange.claims[profile.groupsClaim || 'cognito:groups']),
            },
            provider: profile.provider,
            expiresAtEpochMs: exchange.expiresAtEpochMs,
        };
    }

    private normalizeGroups(value: unknown): readonly string[] {
        if (Array.isArray(value)) {
            return value.map((entry) => this.clean(entry)).filter(Boolean);
        }

        const cleaned = this.clean(value);
        return cleaned ? [cleaned] : [];
    }

    private resolvePostLoginPath(profile: TDraftAuthRuntimeConfig): string {
        return this.safeSameOriginPath(profile.postLoginPath)
            || this.routePathByPageId(profile.accountPageId)
            || this.firstProtectedRouteForLogin(profile.loginPath)
            || '/';
    }

    private resolvePostLogoutPath(profile: TDraftAuthRuntimeConfig | null | undefined): string {
        return this.safeSameOriginPath(profile?.postLogoutPath)
            || this.safeSameOriginPath(profile?.logoutPath)
            || this.safeSameOriginPath(profile?.loginPath)
            || '/';
    }

    private routePathByPageId(pageId: unknown): string {
        const targetPageId = this.clean(pageId);
        if (!targetPageId) {
            return '';
        }

        return this.configStore.siteConfig()?.routes
            ?.find((route) => route.pageId === targetPageId && this.safeSameOriginPath(route.path))
            ?.path ?? '';
    }

    private firstProtectedRouteForLogin(loginPath: unknown): string {
        const normalizedLoginPath = this.safeSameOriginPath(loginPath);
        return this.configStore.siteConfig()?.routes
            ?.find((route) => (
                route.auth?.required === true
                && this.safeSameOriginPath(route.path)
                && (
                    !normalizedLoginPath
                    || this.safeSameOriginPath(route.auth.redirectTo) === normalizedLoginPath
                )
            ))
            ?.path ?? '';
    }

    private isCallbackRoute(url: string, redirectPath: string): boolean {
        const currentOrigin = this.currentOrigin();
        if (!currentOrigin || !this.safeSameOriginPath(redirectPath)) {
            return false;
        }

        try {
            const parsed = new URL(url, currentOrigin);
            return parsed.pathname === redirectPath;
        } catch {
            return false;
        }
    }

    private currentOrigin(): string | null {
        if (typeof window === 'undefined' || !window.location?.origin) {
            return null;
        }

        return window.location.origin;
    }

    private resolveCurrentSameOriginUrl(path: unknown): string {
        const origin = this.currentOrigin();
        const safePath = this.safeSameOriginPath(path);
        if (!origin || !safePath || typeof window === 'undefined') {
            return '';
        }

        try {
            const url = new URL(safePath, origin);
            const currentUrl = new URL(window.location.href);
            DRAFT_RUNTIME_STICKY_QUERY_PARAMS.forEach((key) => {
                if (!url.searchParams.has(key) && currentUrl.searchParams.has(key)) {
                    url.searchParams.set(key, currentUrl.searchParams.get(key) ?? '');
                }
            });
            return url.toString();
        } catch {
            return '';
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

    private isInteractiveAction(value: string): value is TAuthInteractiveAction {
        return value === 'login' || value === 'signup' || value === 'forgotPassword';
    }

    private callbackFailureResult(
        profile: TDraftAuthRuntimeConfig,
        reason: TAuthCallbackHandlingResult['reason'],
    ): TAuthCallbackHandlingResult {
        return this.result(true, this.safeSameOriginPath(profile.loginPath), reason);
    }

    private parseTransaction(raw: string | null | undefined): TAuthPkceTransaction | null {
        if (!raw) return null;

        try {
            const parsed = JSON.parse(raw) as Partial<TAuthPkceTransaction>;
            const action = this.clean(parsed.action);
            if (
                parsed.version !== 1
                || !this.isInteractiveAction(action)
                || !this.clean(parsed.authProfileId)
                || !this.clean(parsed.state)
                || !this.clean(parsed.codeVerifier)
                || !this.clean(parsed.redirectUri)
                || !Number.isFinite(Number(parsed.createdAtEpochMs))
            ) {
                return null;
            }

            return {
                version: 1,
                action,
                authProfileId: this.clean(parsed.authProfileId),
                state: this.clean(parsed.state),
                codeVerifier: this.clean(parsed.codeVerifier),
                redirectUri: this.clean(parsed.redirectUri),
                createdAtEpochMs: Number(parsed.createdAtEpochMs),
            };
        } catch {
            return null;
        }
    }

    private writeTransactionCookie(payload: string): boolean {
        if (typeof document === 'undefined') {
            return false;
        }

        try {
            const encodedPayload = encodeURIComponent(payload);
            document.cookie = `${ AUTH_PKCE_STORAGE_KEY }=${ encodedPayload }; Max-Age=${ Math.floor(PKCE_TRANSACTION_TTL_MS / 1000) }; Path=/; SameSite=Lax${ this.secureCookieSuffix() }`;
            return this.readCookie(AUTH_PKCE_STORAGE_KEY) === encodedPayload;
        } catch {
            return false;
        }
    }

    private readTransactionCookie(): TAuthPkceTransaction | null {
        try {
            const raw = this.readCookie(AUTH_PKCE_STORAGE_KEY);
            return raw ? this.parseTransaction(decodeURIComponent(raw)) : null;
        } catch {
            return null;
        }
    }

    private clearTransactionCookie(): void {
        if (typeof document === 'undefined') {
            return;
        }

        try {
            document.cookie = `${ AUTH_PKCE_STORAGE_KEY }=; Max-Age=0; Path=/; SameSite=Lax${ this.secureCookieSuffix() }`;
        } catch {
            // Cookie storage can be unavailable in locked-down contexts.
        }
    }

    private readCookie(name: string): string {
        if (typeof document === 'undefined' || !document.cookie) {
            return '';
        }

        const prefix = `${ name }=`;
        const cookie = document.cookie
            .split(';')
            .map((entry) => entry.trim())
            .find((entry) => entry.startsWith(prefix));
        return cookie ? cookie.slice(prefix.length) : '';
    }

    private secureCookieSuffix(): string {
        return typeof window !== 'undefined' && window.location?.protocol === 'https:'
            ? '; Secure'
            : '';
    }

    private result(
        handled: boolean,
        redirectTo: string | null,
        reason: TAuthCallbackHandlingResult['reason'],
    ): TAuthCallbackHandlingResult {
        return {
            handled,
            redirectTo,
            reason,
        };
    }
}
