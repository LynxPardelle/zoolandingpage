import { Injectable, inject } from '@angular/core';
import { ConfigStoreService } from './config-store.service';
import type {
    TRuntimeApiProxyActionRequest,
    TRuntimeApiProxyReadRequest,
    TRuntimeApiProxyResponse,
} from './runtime-api-proxy-client.service';

const CONTENT_HUB_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_CONTENT_HUB_BASE_PATH = '/features/content-hub';

@Injectable({ providedIn: 'root' })
export class ContentHubClientService {
    private readonly configStore = inject(ConfigStoreService);

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

        try {
            const response = await fetch(this.operationPath(operation, contentHub?.hubId), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify(payload),
                ...(controller ? { signal: controller.signal } : {}),
            });
            const parsed = await this.parseJson<T & { readonly ok?: boolean; readonly error?: unknown }>(response);
            if (!response.ok || parsed.ok === false) {
                throw new Error(this.clean(parsed.error) || 'Content hub request failed.');
            }
            return parsed;
        } catch (error) {
            if (this.isAbortError(error)) {
                throw new Error('Content hub request timed out.');
            }
            throw error;
        } finally {
            if (timeout !== null) {
                globalThis.clearTimeout(timeout);
            }
        }
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

    private isAbortError(error: unknown): boolean {
        return typeof DOMException !== 'undefined'
            && error instanceof DOMException
            && error.name === 'AbortError';
    }
}
