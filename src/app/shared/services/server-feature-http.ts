import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, inject } from '@angular/core';
import { ConfigStoreService } from './config-store.service';
import { LanguageService } from './language.service';

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_PENDING_IDEMPOTENCY_KEYS = 20;
const AMBIGUOUS_HTTP_STATUSES = new Set([408, 425, 429]);
type TServerFeatureHttpOptions = {
    readonly path: string;
    readonly domain: string;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly protectedRequest: boolean;
    readonly csrf: boolean;
    readonly idempotency: boolean;
};

type TResolvedServerFeatureHttpOptions = TServerFeatureHttpOptions & {
    readonly configStore: ConfigStoreService;
    readonly language: LanguageService;
};

class SafeServerFeatureError extends Error {
    requestId?: string;
    readonly ambiguous: boolean;

    constructor(message: string, ambiguous: boolean, requestId = '') {
        super(message);
        this.name = 'SafeServerFeatureError';
        this.ambiguous = ambiguous;
        if (/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) this.requestId = requestId;
    }
}

const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const clean = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const safeMessage = (
    language: LanguageService,
    kind: 'auth' | 'permission' | 'identity' | 'conflict' | 'validation' | 'rateLimit' | 'service' | 'timeout' | 'generic',
): string => {
    const spanish = clean(language.currentLanguage()).toLowerCase().startsWith('es');
    const messages = spanish
        ? {
            auth: 'Tu sesión no está activa. Inicia sesión de nuevo y vuelve a intentar.',
            permission: 'No tienes permisos para completar esta acción.',
            identity: 'No pudimos identificar el recurso solicitado.',
            conflict: 'No pudimos guardar porque el recurso cambió. Actualiza la información y vuelve a intentar.',
            validation: 'Revisa los datos antes de volver a intentar.',
            rateLimit: 'Hay demasiadas solicitudes por ahora. Espera un momento y vuelve a intentar.',
            service: 'El servicio seguro no respondió correctamente. Vuelve a intentar en unos segundos.',
            timeout: 'El servicio seguro tardó demasiado. Vuelve a intentar en unos segundos.',
            generic: 'No pudimos completar la operación. Vuelve a intentar.',
        }
        : {
            auth: 'Your session is not active. Sign in again and retry.',
            permission: 'You do not have permission to complete this action.',
            identity: 'We could not identify the requested resource.',
            conflict: 'The resource changed before it could be saved. Refresh and retry.',
            validation: 'Review the submitted data and retry.',
            rateLimit: 'There are too many requests right now. Wait a moment and retry.',
            service: 'The secure service did not respond correctly. Retry in a few seconds.',
            timeout: 'The secure service took too long. Retry in a few seconds.',
            generic: 'We could not complete the operation. Retry.',
        };
    return messages[kind];
};

const errorKind = (status: number, code: string): Parameters<typeof safeMessage>[1] => {
    if (status === 401 || code === 'auth_required') return 'auth';
    if (status === 403 || ['forbidden', 'tenant_mismatch', 'environment_mismatch', 'group_mismatch'].includes(code)) return 'permission';
    if (status === 404 || code === 'not_found') return 'identity';
    if (status === 409 || code === 'conflict') return 'conflict';
    if (status === 400 || code === 'validation_error') return 'validation';
    if (status === 429 || code === 'rate_limited') return 'rateLimit';
    if ([500, 502, 503, 504].includes(status) || ['upstream_unavailable', 'internal_error'].includes(code)) return 'service';
    return 'generic';
};

const csrfCookieValue = (configStore: ConfigStoreService): string => {
    const cookieName = clean(configStore.siteConfig()?.runtime?.auth?.session?.csrfCookieName) || 'zlp_csrf';
    if (typeof document === 'undefined' || !document.cookie) return '';
    return document.cookie
        .split(';')
        .map((entry) => entry.trim().split('='))
        .find(([key]) => key === cookieName)?.[1] ?? '';
};

const canonicalJson = (value: unknown, arrayEntry = false): string => {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return arrayEntry ? 'null' : '';
    if (Array.isArray(value)) return `[${ value.map((entry) => canonicalJson(entry, true)).join(',') }]`;
    if (value && typeof value === 'object') {
        return `{${ Object.entries(value as Record<string, unknown>)
            .filter(([, entry]) => entry !== undefined && typeof entry !== 'function' && typeof entry !== 'symbol')
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, entry]) => `${ JSON.stringify(key) }:${ canonicalJson(entry) }`)
            .join(',') }}`;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) return 'null';
    return JSON.stringify(value) ?? 'null';
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const serverFeatureRequestUrl = (
    path: string,
    requestUrl: string,
    browserOrigin: string,
): string => {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u001F\u007F]/.test(path)) throw new Error('Invalid server feature path.');
    const parsedPath = new URL(path, 'https://server-feature.invalid');
    const allowedPaths = new Set([
        '/features/data-spaces/read', '/features/data-spaces/action', '/features/data-spaces/public-read',
        '/features/commerce/public-read', '/features/commerce/read', '/features/commerce/catalog/action',
        '/features/commerce/inventory/action', '/features/commerce/subscription/action', '/features/commerce/public-action',
        '/features/integrations/read', '/features/integrations/action', '/features/integrations/stripe/onboarding',
    ]);
    if (!allowedPaths.has(parsedPath.pathname) || parsedPath.hash) throw new Error('Invalid server feature path.');
    if (parsedPath.search) {
        const values = parsedPath.searchParams.getAll('draftDomain');
        if (parsedPath.pathname !== '/features/commerce/public-action'
            || Array.from(parsedPath.searchParams.keys()).some((key) => key !== 'draftDomain')
            || values.length !== 1 || !/^[A-Za-z0-9.-]{1,253}$/.test(values[0])) {
            throw new Error('Invalid server feature path.');
        }
    }

    const rawOrigin = requestUrl.trim() || browserOrigin.trim() || 'http://localhost';
    let origin: URL;
    try {
        origin = new URL(rawOrigin);
    } catch {
        throw new Error('Invalid server feature origin.');
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname.toLowerCase());
    if (origin.username || origin.password || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && local))) {
        throw new Error('Invalid server feature origin.');
    }
    return new URL(`${ parsedPath.pathname }${ parsedPath.search }`, origin.origin).toString();
};

const requestDigest = async (options: TResolvedServerFeatureHttpOptions): Promise<string> => {
    if (!globalThis.crypto?.subtle) throw new SafeServerFeatureError(safeMessage(options.language, 'service'), false);
    const bytes = new TextEncoder().encode(canonicalJson({
        domain: options.domain,
        path: options.path,
        payload: options.payload,
    }));
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const idempotency = async (
    options: TResolvedServerFeatureHttpOptions,
    pendingIdempotencyKeys: Map<string, string>,
): Promise<{ readonly cacheKey: string; readonly value: string }> => {
    try {
        const cacheKey = await requestDigest(options);
        const existing = pendingIdempotencyKeys.get(cacheKey);
        if (existing) return { cacheKey, value: existing };
        if (!globalThis.crypto?.getRandomValues) throw new SafeServerFeatureError(safeMessage(options.language, 'service'), false);
        const value = bytesToBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
        if (pendingIdempotencyKeys.size >= MAX_PENDING_IDEMPOTENCY_KEYS) {
            // ponytail: fail closed after 20 ambiguous mutations; add durable encrypted recovery only if real traffic reaches this ceiling.
            throw new SafeServerFeatureError(safeMessage(options.language, 'service'), false);
        }
        pendingIdempotencyKeys.set(cacheKey, value);
        return { cacheKey, value };
    } catch (error) {
        if (error instanceof SafeServerFeatureError) throw error;
        throw new SafeServerFeatureError(safeMessage(options.language, 'service'), false);
    }
};

const requestServerFeature = async <T>(
    options: TResolvedServerFeatureHttpOptions,
    pendingIdempotencyKeys: Map<string, string>,
): Promise<T> => {
    const authProfileId = clean(options.configStore.siteConfig()?.runtime?.auth?.authProfileId)
        || clean(options.configStore.siteConfig()?.runtime?.authRemote?.authProfileId);
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-ZLP-Domain': options.domain,
        ...(options.protectedRequest && authProfileId ? { 'X-ZLP-Auth-Profile-Id': authProfileId } : {}),
    };
    if (options.csrf) {
        const headerName = clean(options.configStore.siteConfig()?.runtime?.auth?.session?.csrfHeaderName) || 'X-ZLP-CSRF';
        headers[headerName] = csrfCookieValue(options.configStore);
    }
    const recovery = options.idempotency ? await idempotency(options, pendingIdempotencyKeys) : null;
    if (recovery) headers['Idempotency-Key'] = recovery.value;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
    let definitive = false;
    try {
        const response = await fetch(options.path, {
            method: 'POST',
            redirect: 'error',
            credentials: 'include',
            headers,
            body: JSON.stringify(options.payload),
            ...(controller ? { signal: controller.signal } : {}),
        });
        const raw = await response.text();
        let decoded: unknown;
        try {
            decoded = raw ? JSON.parse(raw) as unknown : null;
        } catch {
            throw new SafeServerFeatureError(safeMessage(options.language, 'generic'), true);
        }
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
            throw new SafeServerFeatureError(safeMessage(options.language, 'generic'), true);
        }
        const parsed = decoded as Record<string, unknown>;
        if (!response.ok || parsed['ok'] === false || parsed['error']) {
            definitive = response.ok
                || (response.status >= 400
                    && response.status < 500
                    && !AMBIGUOUS_HTTP_STATUSES.has(response.status));
            const error = record(parsed['error']);
            const code = clean(error['code']) || clean(parsed['error']);
            const requestId = clean(parsed['requestId']) || clean(error['requestId']);
            throw new SafeServerFeatureError(safeMessage(options.language, errorKind(response.status, code)), false, requestId);
        }
        if (!Object.prototype.hasOwnProperty.call(parsed, 'data')) {
            throw new SafeServerFeatureError(safeMessage(options.language, 'generic'), true);
        }
        definitive = true;
        return parsed as T;
    } catch (error) {
        if (error instanceof SafeServerFeatureError) throw error;
        const aborted = typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError';
        throw new SafeServerFeatureError(safeMessage(options.language, aborted ? 'timeout' : 'service'), !definitive);
    } finally {
        if (timeout !== null) globalThis.clearTimeout(timeout);
        if (recovery && definitive) pendingIdempotencyKeys.delete(recovery.cacheKey);
    }
};

@Injectable({ providedIn: 'root' })
export class ServerFeatureHttpService {
    private readonly configStore = inject(ConfigStoreService);
    private readonly language = inject(LanguageService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly requestContext = inject(REQUEST, { optional: true });
    private readonly pendingIdempotencyKeys = new Map<string, string>();

    request<T>(options: TServerFeatureHttpOptions): Promise<T> {
        const path = isPlatformBrowser(this.platformId)
            ? options.path
            : serverFeatureRequestUrl(options.path, String(this.requestContext?.url ?? ''), '');
        return requestServerFeature<T>({
            ...options,
            path,
            configStore: this.configStore,
            language: this.language,
        }, this.pendingIdempotencyKeys);
    }

    invalidRequest<T = never>(): Promise<T> {
        return Promise.reject(new SafeServerFeatureError(safeMessage(this.language, 'validation'), false));
    }
}
