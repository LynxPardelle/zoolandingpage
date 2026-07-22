import { Injectable, InjectionToken, inject } from '@angular/core';

export type TServerFeatureBrowser = {
    readonly currentUrl: () => string;
    readonly replaceUrl: (url: string) => void;
    readonly navigate: (url: string) => void;
};

export const SERVER_FEATURE_BROWSER = new InjectionToken<TServerFeatureBrowser>('SERVER_FEATURE_BROWSER', {
    providedIn: 'root',
    factory: () => ({
        currentUrl: () => typeof location === 'undefined' ? 'http://localhost/' : location.href,
        replaceUrl: (url) => {
            if (typeof history !== 'undefined') history.replaceState(history.state, '', url);
        },
        navigate: (url) => {
            if (typeof location !== 'undefined') location.assign(url);
        },
    }),
});

const safeRedirectError = (): Error => new Error('The secure redirect could not be opened.');
const STRIPE_OAUTH_MAX_VALUE_LENGTH = 1024;
const STRIPE_OAUTH_ERRORS = new Set([
    'access_denied',
    'invalid_scope',
    'server_error',
    'temporarily_unavailable',
]);
const STRIPE_OAUTH_RESULT_FIELDS = ['state', 'code', 'error'] as const;
const STRIPE_OAUTH_QUERY_FIELDS = [
    ...STRIPE_OAUTH_RESULT_FIELDS,
    'scope',
    'livemode',
    'stripe_user_id',
    'error_description',
    'error_uri',
] as const;

const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const projectStripeOnboardingStatusData = (value: unknown): Readonly<Record<string, unknown>> => {
    const response = record(value);
    const status = response['status'];
    if (!['pending', 'ready'].includes(String(status))) {
        throw new Error('The secure onboarding service returned an unsupported status.');
    }
    const projected: Record<string, unknown> = { status };
    for (const field of ['chargesEnabled', 'payoutsEnabled', 'detailsSubmitted', 'capabilitiesReady']) {
        if (typeof response[field] === 'boolean') projected[field] = response[field];
    }
    const requirementsDueCount = response['requirementsDueCount'];
    if (typeof requirementsDueCount === 'number'
        && Number.isInteger(requirementsDueCount)
        && requirementsDueCount >= 0
        && requirementsDueCount <= 100) {
        projected['requirementsDueCount'] = requirementsDueCount;
    }
    return projected;
};

const isStripeHttpsUrl = (value: string, expectedHost: string): boolean => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.hostname.toLowerCase() === expectedHost
            && !url.username
            && !url.password
            && (!url.port || url.port === '443');
    } catch {
        return false;
    }
};

@Injectable({ providedIn: 'root' })
export class ServerFeatureHandoffService {
    private readonly browser = inject(SERVER_FEATURE_BROWSER);

    captureStripeOnboardingReturn(): Record<string, string> {
        let url: URL;
        try {
            url = new URL(this.browser.currentUrl(), 'http://localhost');
        } catch {
            throw safeRedirectError();
        }
        const values = Object.fromEntries(
            STRIPE_OAUTH_RESULT_FIELDS.map((key) => [key, url.searchParams.getAll(key)]),
        ) as Record<string, string[]>;
        for (const key of STRIPE_OAUTH_QUERY_FIELDS) url.searchParams.delete(key);
        const query = url.searchParams.toString();
        this.browser.replaceUrl(`${ url.pathname }${ query ? `?${ query }` : '' }${ url.hash }`);

        const state = values['state'][0] ?? '';
        const code = values['code'][0] ?? '';
        const error = values['error'][0] ?? '';
        if (values['state'].length !== 1 || state.length < 1 || state.length > STRIPE_OAUTH_MAX_VALUE_LENGTH
            || values['code'].length > 1 || values['error'].length > 1
            || values['code'].length + values['error'].length !== 1
            || (values['code'].length === 1
                && (code.length < 1
                    || code.length > STRIPE_OAUTH_MAX_VALUE_LENGTH
                    || [...code].some((character) => character.codePointAt(0)! < 33)))
            || (values['error'].length === 1 && !STRIPE_OAUTH_ERRORS.has(error))) {
            throw safeRedirectError();
        }
        return {
            state,
            ...(code ? { code } : {}),
            ...(error ? { error } : {}),
        };
    }

    consumeRedirect(operation: string, data: unknown): boolean {
        const route = operation === 'stripeOnboardingStart'
            ? { field: 'handoffUrl', host: 'connect.stripe.com', expires: false }
            : operation === 'openPortal'
                ? { field: 'redirectUrl', host: 'billing.stripe.com', expires: true }
                : operation === 'admitCheckout'
                    ? { field: 'redirectUrl', host: 'checkout.stripe.com', expires: true }
                    : null;
        const field = route?.field ?? '';
        if (!field) return false;
        const response = record(data);
        const value = response[field];
        const expiresAt = response['expiresAt'];
        if (typeof value !== 'string' || !isStripeHttpsUrl(value, route!.host)
            || (route!.expires && (typeof expiresAt !== 'number' || !Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)))) {
            throw safeRedirectError();
        }
        try {
            this.browser.navigate(value);
        } catch {
            throw safeRedirectError();
        }
        return true;
    }
}
