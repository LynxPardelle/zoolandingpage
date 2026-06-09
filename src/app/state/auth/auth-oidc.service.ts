import type { TDraftAuthRuntimeConfig } from '@/app/shared/types/config-payloads.types';
import { Injectable } from '@angular/core';

export type TAuthLoginUrlOptions = {
    readonly origin: string;
    readonly state: string;
    readonly codeChallenge: string;
};

export type TAuthCallbackResult = {
    readonly code: string | null;
    readonly state: string | null;
    readonly error: string | null;
    readonly errorDescription: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthOidcService {
    buildLoginUrl(
        profile: TDraftAuthRuntimeConfig | null | undefined,
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

        const url = new URL('/oauth2/authorize', hostedUiDomain.origin);
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
}
