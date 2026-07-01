import { Injectable, inject } from '@angular/core';
import { ConfigStoreService } from './config-store.service';
import { LanguageService } from './language.service';
import type {
    TRuntimeApiProxyActionRequest,
    TRuntimeApiProxyReadRequest,
    TRuntimeApiProxyResponse,
} from './runtime-api-proxy-client.service';

const CONTENT_HUB_REQUEST_TIMEOUT_MS = 10_000;
const CONTENT_HUB_UPLOAD_JSON_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_CONTENT_HUB_BASE_PATH = '/features/content-hub';

type TContentHubSerializableRequest = TRuntimeApiProxyReadRequest | TRuntimeApiProxyActionRequest;

@Injectable({ providedIn: 'root' })
export class ContentHubClientService {
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
        const contentHub = this.contentHubContext(payload.input);
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-ZLP-Domain': payload.domain,
            ...(contentHub?.hubId ? { 'X-ZLP-Content-Hub-Id': contentHub.hubId } : {}),
            ...(this.authProfileId() ? { 'X-ZLP-Auth-Profile-Id': this.authProfileId() } : {}),
        };
        if (csrf) {
            headers[this.csrfHeaderName()] = this.csrfCookieValue();
        }

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeout = controller
            ? globalThis.setTimeout(() => controller.abort(), CONTENT_HUB_REQUEST_TIMEOUT_MS)
            : null;
        const bodyPayload = operation === 'action'
            ? await this.serializeActionPayload(payload as TRuntimeApiProxyActionRequest)
            : payload;

        try {
            const response = await fetch(this.operationPath(operation, contentHub?.hubId), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(bodyPayload),
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
                throw new Error(this.localizedMessage('timeout'));
            }
            throw error;
        } finally {
            if (timeout !== null) {
                globalThis.clearTimeout(timeout);
            }
        }
    }

    private async serializeActionPayload(payload: TRuntimeApiProxyActionRequest): Promise<TContentHubSerializableRequest> {
        if (this.contentHubAction(payload.input) !== 'uploadAsset') {
            return payload;
        }

        const input = await this.serializeUploadValue(payload.input);
        return {
            ...payload,
            ...(this.isRecord(input) ? { input } : {}),
        };
    }

    private contentHubAction(input: Record<string, unknown> | undefined): string {
        const contentHub = input?.['contentHub'];
        if (!this.isRecord(contentHub)) {
            return '';
        }
        return this.clean(contentHub['action']);
    }

    private async serializeUploadValue(value: unknown): Promise<unknown> {
        if (Array.isArray(value)) {
            const entries = await Promise.all(value.map((entry) => this.serializeUploadValue(entry)));
            return entries.filter((entry) => entry !== undefined);
        }

        if (this.isBrowserFile(value)) {
            return this.serializeFile(value);
        }

        if (!this.isRecord(value)) {
            return value;
        }

        const entries = await Promise.all(Object.entries(value).map(async ([key, entry]) => [
            key,
            await this.serializeUploadValue(entry),
        ] as const));
        return entries.reduce<Record<string, unknown>>((acc, [key, entry]) => {
            if (entry !== undefined) {
                acc[key] = entry;
            }
            return acc;
        }, {});
    }

    private async serializeFile(file: File): Promise<Record<string, unknown>> {
        if (file.size > CONTENT_HUB_UPLOAD_JSON_MAX_BYTES) {
            throw new Error(this.localizedMessage('validation'));
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        return {
            kind: 'browser-file',
            name: file.name,
            mimeType: file.type,
            size: file.size,
            lastModified: file.lastModified,
            dataBase64: this.bytesToBase64(bytes),
        };
    }

    private bytesToBase64(bytes: Uint8Array): string {
        let binary = '';
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
        }
        return btoa(binary);
    }

    private operationPath(operation: 'read' | 'action', hubId: string | undefined): string {
        const basePath = this.safePath(this.hubPublicApiBasePath(hubId)) || DEFAULT_CONTENT_HUB_BASE_PATH;
        return `${ basePath.replace(/\/$/, '') }/${ operation }`;
    }

    private hubPublicApiBasePath(hubId: string | undefined): string {
        const normalizedHubId = this.clean(hubId);
        const hubs = this.configStore.siteConfig()?.runtime?.contentHubs ?? [];
        const hub = normalizedHubId
            ? hubs.find((candidate) => candidate.hubId === normalizedHubId)
            : hubs[0];
        return this.clean(hub?.publicApiBasePath);
    }

    private contentHubContext(input: Record<string, unknown> | undefined): { readonly hubId?: string } | null {
        const contentHub = input?.['contentHub'];
        if (!contentHub || typeof contentHub !== 'object' || Array.isArray(contentHub)) {
            return null;
        }
        return {
            hubId: this.clean((contentHub as { readonly hubId?: unknown }).hubId),
        };
    }

    private authProfileId(): string {
        const runtime = this.configStore.siteConfig()?.runtime;
        return this.clean(runtime?.auth?.authProfileId) || this.clean(runtime?.authRemote?.authProfileId);
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
        const raw = this.clean(error).toLowerCase();
        if (status === 401 || raw.includes('auth_required') || raw.includes('unauthorized')) {
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
            || raw.includes('articleid is required')
            || raw.includes('revision not found')
        ) {
            return this.localizedMessage('identity');
        }
        if (
            status === 409
            || raw.includes('conflict')
            || raw.includes('already exists')
            || raw.includes('slug')
        ) {
            return this.localizedMessage('conflict');
        }
        if (
            status === 400
            || raw.includes('validation')
            || raw.includes('invalid ')
            || raw.includes('required')
            || raw.includes('too large')
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
                permission: 'No tienes permisos para completar esta acción en el gestor de contenido.',
                identity: 'No pudimos identificar el artículo o la versión. Abre la acción desde la lista y vuelve a intentar.',
                conflict: 'No pudimos guardar porque hay un conflicto con una URL, slug o registro existente.',
                validation: 'Revisa los campos del formulario. Hay un valor que el gestor de contenido no puede aceptar.',
                rateLimit: 'Hay demasiadas solicitudes por ahora. Espera un momento y vuelve a intentar.',
                service: 'El servicio seguro de contenido no respondió correctamente. Vuelve a intentar en unos segundos.',
                timeout: 'El servicio seguro de contenido tardó demasiado. Vuelve a intentar en unos segundos.',
                generic: 'No pudimos completar la operación en el gestor de contenido. Vuelve a intentar.',
            }
            : {
                auth: 'Your session is not active. Sign in again and retry.',
                permission: 'You do not have permission to complete this content action.',
                identity: 'We could not identify the article or revision. Open the action from the list and retry.',
                conflict: 'We could not save because a URL, slug, or record already conflicts.',
                validation: 'Review the form fields. One value cannot be accepted by the content service.',
                rateLimit: 'There are too many requests right now. Wait a moment and retry.',
                service: 'The secure content service did not respond correctly. Retry in a few seconds.',
                timeout: 'The secure content service took too long. Retry in a few seconds.',
                generic: 'We could not complete the content operation. Retry.',
            };
        return messages[kind];
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    private isBrowserFile(value: unknown): value is File {
        return typeof File !== 'undefined' && value instanceof File;
    }

    private isAbortError(error: unknown): boolean {
        return typeof DOMException !== 'undefined'
            && error instanceof DOMException
            && error.name === 'AbortError';
    }
}
