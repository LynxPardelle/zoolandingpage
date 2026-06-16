import type { TDraftAuthRuntimeConfig } from '@/app/shared/types/config-payloads.types';
import { Injectable } from '@angular/core';

export type TAuthLoginUrlOptions = {
    readonly origin: string;
    readonly state: string;
    readonly codeChallenge: string;
};

export type TAuthLogoutUrlOptions = {
    readonly origin: string;
};

export type TAuthTokenExchangeOptions = {
    readonly origin: string;
    readonly code: string;
    readonly codeVerifier: string;
    readonly fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export type TAuthCallbackResult = {
    readonly code: string | null;
    readonly state: string | null;
    readonly error: string | null;
    readonly errorDescription: string | null;
};

export type TAuthTokenExchangeResult = {
    readonly claims: Readonly<Record<string, unknown>>;
    readonly expiresAtEpochMs: number;
};

@Injectable({ providedIn: 'root' })
export class AuthOidcService {
    buildLoginUrl(
        profile: TDraftAuthRuntimeConfig | null | undefined,
        options: TAuthLoginUrlOptions,
    ): string | null {
        return this.buildInteractiveUrl(profile, '/oauth2/authorize', options);
    }

    buildSignupUrl(
        profile: TDraftAuthRuntimeConfig | null | undefined,
        options: TAuthLoginUrlOptions,
    ): string | null {
        return this.buildInteractiveUrl(profile, '/signup', options);
    }

    buildForgotPasswordUrl(
        profile: TDraftAuthRuntimeConfig | null | undefined,
        options: TAuthLoginUrlOptions,
    ): string | null {
        return this.buildInteractiveUrl(profile, '/forgotPassword', options);
    }

    buildLogoutUrl(
        profile: TDraftAuthRuntimeConfig | null | undefined,
        options: TAuthLogoutUrlOptions,
    ): string | null {
        if (!profile?.enabled || profile.provider !== 'cognito') {
            return null;
        }

        const hostedUiDomain = this.parseHttpsUrl(profile.hostedUiDomain);
        const clientId = this.clean(profile.clientId);
        const logoutPath = this.clean(profile.postLogoutPath) || this.clean(profile.logoutPath);
        const origin = this.parseOrigin(options.origin);

        if (!hostedUiDomain || !clientId || !this.isSafeSameOriginPath(logoutPath) || !origin) {
            return null;
        }

        const url = new URL('/logout', hostedUiDomain.origin);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('logout_uri', new URL(logoutPath, origin.origin).toString());
        return url.toString();
    }

    async exchangeAuthorizationCode(
        profile: TDraftAuthRuntimeConfig | null | undefined,
        options: TAuthTokenExchangeOptions,
    ): Promise<TAuthTokenExchangeResult | null> {
        if (!profile?.enabled || profile.provider !== 'cognito') {
            return null;
        }

        const hostedUiDomain = this.parseHttpsUrl(profile.hostedUiDomain);
        const issuer = this.parseHttpsUrl(profile.issuer);
        const clientId = this.clean(profile.clientId);
        const redirectPath = this.clean(profile.redirectPath);
        const origin = this.parseOrigin(options.origin);
        const code = this.clean(options.code);
        const codeVerifier = this.clean(options.codeVerifier);
        const fetcher = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

        if (!hostedUiDomain || !issuer || !clientId || !this.isSafeSameOriginPath(redirectPath) || !origin || !code || !codeVerifier || !fetcher) {
            return null;
        }

        const body = new URLSearchParams();
        body.set('grant_type', 'authorization_code');
        body.set('client_id', clientId);
        body.set('code', code);
        body.set('redirect_uri', new URL(redirectPath, origin.origin).toString());
        body.set('code_verifier', codeVerifier);

        const response = await fetcher(new URL('/oauth2/token', hostedUiDomain.origin), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json() as Record<string, unknown>;
        const idToken = this.clean(payload['id_token']);
        const claims = this.decodeJwtPayload(idToken);
        if (!claims) {
            return null;
        }

        const expiresAtEpochMs = this.validateIdTokenClaims(claims, {
            issuer: issuer.toString(),
            clientId,
        });
        if (!expiresAtEpochMs) {
            return null;
        }

        return {
            claims,
            expiresAtEpochMs,
        };
    }

    private buildInteractiveUrl(
        profile: TDraftAuthRuntimeConfig | null | undefined,
        endpointPath: '/oauth2/authorize' | '/signup' | '/forgotPassword',
        options: TAuthLoginUrlOptions,
    ): string | null {
        if (!profile?.enabled || profile.provider !== 'cognito') {
            return null;
        }

        const hostedUiDomain = this.parseHttpsUrl(profile.hostedUiDomain);
        const issuer = this.parseHttpsUrl(profile.issuer);
        const clientId = this.clean(profile.clientId);
        const redirectPath = this.clean(profile.redirectPath);
        const origin = this.parseOrigin(options.origin);
        const state = this.clean(options.state);
        const codeChallenge = this.clean(options.codeChallenge);
        const scopes = (profile.scopes ?? []).map((scope) => this.clean(scope)).filter(Boolean);

        if (!hostedUiDomain || !issuer || !clientId || !this.isSafeSameOriginPath(redirectPath) || !origin || !state || !codeChallenge || scopes.length === 0) {
            return null;
        }

        const url = new URL(endpointPath, hostedUiDomain.origin);
        url.searchParams.set('client_id', clientId);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('redirect_uri', new URL(redirectPath, origin.origin).toString());
        url.searchParams.set('scope', scopes.join(' '));
        url.searchParams.set('state', state);
        url.searchParams.set('code_challenge', codeChallenge);
        url.searchParams.set('code_challenge_method', 'S256');
        return url.toString();
    }

    parseCallbackUrl(url: string): TAuthCallbackResult {
        try {
            const parsed = new URL(url, 'https://localhost');
            return {
                code: this.emptyToNull(parsed.searchParams.get('code')),
                state: this.emptyToNull(parsed.searchParams.get('state')),
                error: this.emptyToNull(parsed.searchParams.get('error')),
                errorDescription: this.emptyToNull(parsed.searchParams.get('error_description')),
            };
        } catch {
            return {
                code: null,
                state: null,
                error: 'invalid_callback_url',
                errorDescription: null,
            };
        }
    }

    private clean(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private parseHttpsUrl(value: unknown): URL | null {
        if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /[\s\u0000-\u001F\u007F]/.test(value)) {
            return null;
        }

        try {
            const parsed = new URL(value);
            return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed : null;
        } catch {
            return null;
        }
    }

    private parseOrigin(value: unknown): URL | null {
        const cleaned = this.clean(value);
        if (!cleaned || /[\s\u0000-\u001F\u007F]/.test(cleaned)) return null;

        try {
            const parsed = new URL(cleaned);
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
            return parsed;
        } catch {
            return null;
        }
    }

    private isSafeSameOriginPath(value: string): boolean {
        return value.length > 0
            && value.startsWith('/')
            && !value.startsWith('//')
            && !value.includes('\\')
            && !/[\s\u0000-\u001F\u007F]/.test(value);
    }

    private emptyToNull(value: string | null): string | null {
        const cleaned = this.clean(value);
        return cleaned || null;
    }

    private decodeJwtPayload(token: string): Record<string, unknown> | null {
        const parts = token.split('.');
        if (parts.length < 2 || !parts[1]) {
            return null;
        }

        if (typeof atob !== 'function') {
            return null;
        }

        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
            const binary = atob(padded);
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            const json = new TextDecoder().decode(bytes);
            const parsed = JSON.parse(json) as unknown;
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed as Record<string, unknown>
                : null;
        } catch {
            return null;
        }
    }

    private validateIdTokenClaims(
        claims: Readonly<Record<string, unknown>>,
        expected: {
            readonly issuer: string;
            readonly clientId: string;
        },
    ): number | null {
        if (this.clean(claims['iss']) !== expected.issuer) {
            return null;
        }

        if (this.clean(claims['aud']) !== expected.clientId) {
            return null;
        }

        const expiresAtEpochSeconds = Number(claims['exp']);
        if (!Number.isFinite(expiresAtEpochSeconds) || expiresAtEpochSeconds <= 0) {
            return null;
        }

        const expiresAtEpochMs = expiresAtEpochSeconds * 1000;
        return expiresAtEpochMs > Date.now() ? expiresAtEpochMs : null;
    }
}
