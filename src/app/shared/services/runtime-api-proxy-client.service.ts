import { environment } from '@/environments/environment';
import { Injectable, REQUEST, inject } from '@angular/core';

export type TRuntimeApiProxyReadRequest = {
    readonly domain: string;
    readonly pageId?: string;
    readonly sourceId: string;
    readonly input?: Record<string, unknown>;
};

export type TRuntimeApiProxyActionRequest = {
    readonly domain: string;
    readonly pageId?: string;
    readonly actionId: string;
    readonly input?: Record<string, unknown>;
};

export type TRuntimeApiProxyResponse<T = unknown> = {
    readonly ok: boolean;
    readonly data?: T;
    readonly error?: string;
};

@Injectable({ providedIn: 'root' })
export class RuntimeApiProxyClientService {
    private readonly request = inject(REQUEST, { optional: true });

    readSource<T = unknown>(request: TRuntimeApiProxyReadRequest): Promise<TRuntimeApiProxyResponse<T>> {
        return this.postJson<TRuntimeApiProxyResponse<T>>('api-proxy/read', request);
    }

    executeAction<T = unknown>(request: TRuntimeApiProxyActionRequest): Promise<TRuntimeApiProxyResponse<T>> {
        return this.postJson<TRuntimeApiProxyResponse<T>>('api-proxy/action', request);
    }

    private async postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
        const response = await fetch(this.buildUrl(path), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const body = await this.parseJsonResponse<TRuntimeApiProxyResponse<T>>(response);
        if (!response.ok) {
            throw new Error(String(body.error || `API proxy request failed with status ${ response.status }`));
        }

        if (body.ok === false) {
            throw new Error(String(body.error || 'API proxy request failed'));
        }

        return body as T;
    }

    private async parseJsonResponse<T>(response: Response): Promise<T> {
        const raw = await response.text();
        return raw ? JSON.parse(raw) as T : {} as T;
    }

    private buildUrl(path: string): string {
        const base = String(environment.apiUrl ?? '').trim().replace(/\/$/, '');
        const target = `${ base }/${ path.replace(/^\//, '') }`;
        return /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(base)
            ? new URL(target).toString()
            : new URL(target, this.resolveOrigin()).toString();
    }

    private resolveOrigin(): string {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl) {
            try {
                return new URL(requestUrl, 'http://localhost').origin;
            } catch {
                // Fall through to browser or localhost origin.
            }
        }

        if (typeof window !== 'undefined' && window.location?.origin) {
            return window.location.origin;
        }

        return 'http://localhost';
    }
}
