import { Injectable, inject } from '@angular/core';
import { ConfigStoreService } from './config-store.service';
import { LanguageService } from './language.service';
import type {
    TRuntimeApiProxyActionRequest,
    TRuntimeApiProxyReadRequest,
    TRuntimeApiProxyResponse,
} from './runtime-api-proxy-client.service';

const COMBO_CATALOG_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_COMBO_CATALOG_READ_PATH = '/features/combo-catalog/read';
const DEFAULT_COMBO_CATALOG_ACTION_PATH = '/features/combo-catalog/action';
const COMMA_LIST_FIELDS = new Set([
    'allowedCombos',
    'allowedComponents',
    'allowedFeatures',
    'allowedGroups',
    'categories',
    'comboIds',
    'components',
    'deniedCombos',
    'deniedComponents',
    'deniedFeatures',
    'deniedGroups',
    'features',
    'groups',
]);

@Injectable({ providedIn: 'root' })
export class ComboCatalogClientService {
    private readonly configStore = inject(ConfigStoreService);
    private readonly language = inject(LanguageService);

    readSource<T = unknown>(request: TRuntimeApiProxyReadRequest): Promise<TRuntimeApiProxyResponse<T>> {
        return this.requestJson<TRuntimeApiProxyResponse<T>>('read', request, false);
    }

    executeAction<T = unknown>(request: TRuntimeApiProxyActionRequest): Promise<TRuntimeApiProxyResponse<T>> {
        return this.requestJson<TRuntimeApiProxyResponse<T>>('action', request, true);
    }

    private async requestJson<T>(
        operation: 'read' | 'action',
        payload: TRuntimeApiProxyReadRequest | TRuntimeApiProxyActionRequest,
        csrf: boolean,
    ): Promise<T> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-ZLP-Domain': payload.domain,
            ...(this.authProfileId() ? { 'X-ZLP-Auth-Profile-Id': this.authProfileId() } : {}),
        };
        if (csrf) {
            headers[this.csrfHeaderName()] = this.csrfCookieValue();
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = controller
            ? globalThis.setTimeout(() => controller.abort(), COMBO_CATALOG_REQUEST_TIMEOUT_MS)
            : null;

        try {
            const response = await fetch(this.operationPath(operation), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    ...payload,
                    ...(this.draftDomain() ? { draftDomain: this.draftDomain() } : {}),
                    ...this.normalizeActionPayload(payload.input ?? {}),
                }),
                ...(controller ? { signal: controller.signal } : {}),
            });
            const parsed = await this.parseJson<T & {
                readonly ok?: boolean;
                readonly error?: unknown;
                readonly requestId?: unknown;
            }>(response);
            if (!response.ok || parsed.ok === false) {
                throw this.errorWithRequestId(
                    this.safeErrorMessage(parsed.error, response.status),
                    parsed.requestId,
                );
            }
            return parsed;
        } catch (error) {
            if (this.isAbortError(error)) {
                throw new Error('Combo catalog request timed out.');
            }
            throw error;
        } finally {
            if (timeout !== null) {
                globalThis.clearTimeout(timeout);
            }
        }
    }

    private operationPath(operation: 'read' | 'action'): string {
        const endpoint = this.safePath(this.configStore.siteConfig()?.runtime?.comboCatalog?.endpoint);
        if (operation === 'read') {
            return endpoint || DEFAULT_COMBO_CATALOG_READ_PATH;
        }
        if (endpoint.endsWith('/read')) {
            return `${ endpoint.slice(0, -'/read'.length) }/action`;
        }
        return DEFAULT_COMBO_CATALOG_ACTION_PATH;
    }

    private authProfileId(): string {
        const runtime = this.configStore.siteConfig()?.runtime;
        return this.clean(runtime?.comboCatalog?.authProfileId)
            || this.clean(runtime?.auth?.authProfileId)
            || this.clean(runtime?.authRemote?.authProfileId);
    }

    private draftDomain(): string {
        return this.clean(this.configStore.siteConfig()?.runtime?.comboCatalog?.draftDomain)
            || this.clean(this.configStore.siteConfig()?.domain);
    }

    private csrfHeaderName(): string {
        return this.clean(this.configStore.siteConfig()?.runtime?.auth?.session?.csrfHeaderName) || 'X-ZLP-CSRF';
    }

    private csrfCookieValue(): string {
        const cookieName = this.clean(this.configStore.siteConfig()?.runtime?.auth?.session?.csrfCookieName) || 'zlp_csrf';
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

    private safePath(value: unknown): string {
        const path = this.clean(value);
        return path.length > 0
            && path.startsWith('/')
            && !path.startsWith('//')
            && !path.includes('\\')
            && !/[\s\u0000-\u001F\u007F]/.test(path)
            ? path
            : '';
    }

    private async parseJson<T>(response: Response): Promise<T> {
        const raw = await response.text();
        return raw ? JSON.parse(raw) as T : { ok: response.ok } as T;
    }

    private clean(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private normalizeActionPayload(input: Record<string, unknown>): Record<string, unknown> {
        return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
            if (COMMA_LIST_FIELDS.has(key) && typeof value === 'string') {
                acc[key] = value
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean);
                return acc;
            }

            if (key === 'batchJson' && typeof value === 'string' && value.trim()) {
                try {
                    const parsed = JSON.parse(value) as unknown;
                    if (Array.isArray(parsed)) {
                        acc['combos'] = parsed;
                    }
                } catch {
                    acc[key] = value;
                }
                return acc;
            }

            acc[key] = value;
            return acc;
        }, {});
    }

    private errorWithRequestId(message: string, requestId: unknown): Error {
        const error = new Error(message) as Error & { requestId?: string };
        const safeRequestId = this.safeRequestId(requestId);
        if (safeRequestId) {
            error.requestId = safeRequestId;
        }
        return error;
    }

    private safeRequestId(value: unknown): string {
        const requestId = this.clean(value);
        return /^req-[A-Za-z0-9._:-]{1,120}$/.test(requestId)
            ? requestId
            : '';
    }

    private safeErrorMessage(error: unknown, status?: number): string {
        const message = this.clean(error);
        const raw = message.toLowerCase();
        if (status === 401 || raw.includes('auth') || raw.includes('unauthorized')) {
            return this.localizedMessage('auth');
        }
        if (status === 403 || raw.includes('forbidden') || raw.includes('csrf') || raw.includes('permission')) {
            return this.localizedMessage('permission');
        }
        if (
            status === 404
            || raw.includes('not_found')
            || raw.includes('not found')
            || raw.includes('invalid id')
            || raw.includes('invalid identifier')
        ) {
            return this.localizedMessage('identity');
        }
        if (
            status === 409
            || raw.includes('conflict')
            || raw.includes('updatedat')
            || raw.includes('changed before')
            || raw.includes('already exists')
        ) {
            return this.localizedMessage('conflict');
        }
        if (
            status === 400
            || raw.includes('validation')
            || raw.includes('invalid ')
            || raw.includes('required')
        ) {
            return this.localizedMessage('validation');
        }
        if (
            status === 429
            || raw.includes('rate_limited')
            || raw.includes('too many')
        ) {
            return this.localizedMessage('rateLimit');
        }
        if (
            raw.includes('timed out')
            || raw.includes('timeout')
            || raw.includes('failed to fetch')
            || raw.includes('upstream')
            || raw.includes('unavailable')
            || status === 500
            || status === 502
            || status === 503
            || status === 504
        ) {
            return this.localizedMessage('service');
        }

        return this.localizedMessage('generic');
    }

    private localizedMessage(kind: 'auth' | 'permission' | 'identity' | 'conflict' | 'validation' | 'rateLimit' | 'service' | 'timeout' | 'generic'): string {
        const isSpanish = this.clean(this.language.currentLanguage()).toLowerCase().startsWith('es');
        const messages = isSpanish
            ? {
                auth: 'Tu sesión no está activa. Inicia sesión de nuevo y vuelve a intentar.',
                permission: 'No tienes permisos para cambiar el catálogo de combos.',
                identity: 'No pudimos identificar el combo, grupo o política. Abre la acción desde la lista y vuelve a intentar.',
                conflict: 'No pudimos guardar porque el registro cambió o ya existe. Actualiza y vuelve a intentar.',
                validation: 'Revisa los campos del formulario. Hay un valor que el catálogo de combos no puede aceptar.',
                rateLimit: 'Hay demasiadas solicitudes por ahora. Espera un momento y vuelve a intentar.',
                service: 'El servicio seguro de combos no respondió correctamente. Vuelve a intentar en unos segundos.',
                timeout: 'El servicio seguro de combos tardó demasiado. Vuelve a intentar en unos segundos.',
                generic: 'No pudimos completar la operación en el catálogo de combos. Vuelve a intentar.',
            }
            : {
                auth: 'Your session is not active. Sign in again and retry.',
                permission: 'You do not have permission to change the combo catalog.',
                identity: 'We could not identify the combo, group, or policy. Open the action from the list and retry.',
                conflict: 'We could not save because the record changed or already exists. Refresh and retry.',
                validation: 'Review the form fields. One value cannot be accepted by the combo catalog.',
                rateLimit: 'There are too many requests right now. Wait a moment and retry.',
                service: 'The secure combo service did not respond correctly. Retry in a few seconds.',
                timeout: 'The secure combo service took too long. Retry in a few seconds.',
                generic: 'We could not complete the combo catalog operation. Retry.',
            };
        return messages[kind];
    }

    private isAbortError(error: unknown): boolean {
        return typeof DOMException !== 'undefined'
            && error instanceof DOMException
            && error.name === 'AbortError';
    }
}
