import { Injectable, inject } from '@angular/core';
import { ConfigStoreService } from '../../shared/services/config-store.service';
import { RuntimeConfigService } from '../../shared/services/runtime-config.service';
import type {
    TDraftAuthAdminRuntimeConfig,
    TDraftAuthSessionRuntimeConfig,
} from '../../shared/types/config-payloads.types';

export type TAuthAdminAccount = {
    readonly subject: string;
    readonly email?: string;
    readonly roles?: readonly string[];
    readonly approvalStatus?: string;
    readonly enabled?: boolean;
    readonly isAdmin?: boolean;
    readonly tenantId?: string;
    readonly environment?: string;
};

export type TAuthAdminResponse<T extends Record<string, unknown> = Record<string, unknown>> = {
    readonly ok: boolean;
} & T;

@Injectable({ providedIn: 'root' })
export class AuthAdminClientService {
    private readonly configStore = inject(ConfigStoreService);
    private readonly runtimeConfig = inject(RuntimeConfigService);

    me(): Promise<TAuthAdminResponse<{ readonly account: TAuthAdminAccount }>> {
        return this.requestJson(this.sessionPath('mePath', '/auth/session/me'), { method: 'GET' });
    }

    listUsers(): Promise<TAuthAdminResponse<{ readonly users: readonly TAuthAdminAccount[] }>> {
        return this.requestJson(this.adminPath('usersPath', '/auth/admin/users'), { method: 'GET' });
    }

    approveUser(subject: string, groups?: readonly string[]): Promise<TAuthAdminResponse<{ readonly user: TAuthAdminAccount }>> {
        return this.requestJson(this.subjectPath('approveUserPathTemplate', '/auth/admin/users/{subject}/approve', subject), {
            method: 'POST',
            csrf: true,
            body: groups?.length ? { groups } : {},
        });
    }

    setUserGroups(subject: string, groups: readonly string[]): Promise<TAuthAdminResponse<{ readonly user: TAuthAdminAccount }>> {
        return this.requestJson(this.subjectPath('groupsPathTemplate', '/auth/admin/users/{subject}/groups', subject), {
            method: 'POST',
            csrf: true,
            body: { groups },
        });
    }

    suspendUser(subject: string): Promise<TAuthAdminResponse<{ readonly user: TAuthAdminAccount }>> {
        return this.requestJson(this.subjectPath('suspendUserPathTemplate', '/auth/admin/users/{subject}/suspend', subject), {
            method: 'POST',
            csrf: true,
            body: {},
        });
    }

    reactivateUser(subject: string): Promise<TAuthAdminResponse<{ readonly user: TAuthAdminAccount }>> {
        return this.requestJson(this.subjectPath('reactivateUserPathTemplate', '/auth/admin/users/{subject}/reactivate', subject), {
            method: 'POST',
            csrf: true,
            body: {},
        });
    }

    private async requestJson<T extends TAuthAdminResponse>(
        path: string,
        options: {
            readonly method: 'GET' | 'POST';
            readonly csrf?: boolean;
            readonly body?: Record<string, unknown>;
        },
    ): Promise<T> {
        const context = this.authContext();
        if (!context) {
            throw new Error('Auth context is unavailable.');
        }
        const headers: Record<string, string> = {
            Accept: 'application/json',
            'X-ZLP-Domain': context.domain,
            'X-ZLP-Auth-Profile-Id': context.authProfileId,
        };
        let body: string | undefined;
        if (options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(options.body);
        }
        if (options.csrf === true) {
            headers[this.csrfHeaderName()] = this.csrfCookieValue();
        }

        const response = await fetch(path, {
            method: options.method,
            credentials: 'include',
            headers,
            ...(body !== undefined ? { body } : {}),
        });
        const parsed = await this.parseJson<T>(response);
        if (!response.ok || parsed.ok === false) {
            throw new Error(this.clean((parsed as { readonly error?: unknown }).error) || 'Auth admin request failed.');
        }
        return parsed;
    }

    private async parseJson<T>(response: Response): Promise<T> {
        const raw = await response.text();
        return raw ? JSON.parse(raw) as T : { ok: response.ok } as T;
    }

    private sessionPath(key: keyof TDraftAuthSessionRuntimeConfig, fallback: string): string {
        return this.safePath(this.sessionConfig()?.[key]) || fallback;
    }

    private adminPath(key: keyof TDraftAuthAdminRuntimeConfig, fallback: string): string {
        return this.safePath(this.adminConfig()?.[key]) || fallback;
    }

    private subjectPath(key: keyof TDraftAuthAdminRuntimeConfig, fallback: string, subject: string): string {
        const template = this.adminPath(key, fallback);
        return template.includes('{subject}')
            ? template.replaceAll('{subject}', encodeURIComponent(subject))
            : template;
    }

    private csrfHeaderName(): string {
        return this.clean(this.sessionConfig()?.csrfHeaderName) || 'X-ZLP-CSRF';
    }

    private csrfCookieValue(): string {
        const cookieName = this.clean(this.sessionConfig()?.csrfCookieName) || 'zlp_csrf';
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

    private sessionConfig(): TDraftAuthSessionRuntimeConfig | null {
        const session = this.runtimeConfig.auth()?.session;
        return session?.mode === 'server-cookie' ? session : null;
    }

    private adminConfig(): TDraftAuthAdminRuntimeConfig | null {
        return this.runtimeConfig.auth()?.admin ?? null;
    }

    private authContext(): { readonly domain: string; readonly authProfileId: string } | null {
        const domain = this.clean(this.configStore.siteConfig()?.domain).toLowerCase();
        const authProfileId = this.clean(this.runtimeConfig.auth()?.authProfileId);
        if (!domain || !authProfileId) {
            return null;
        }
        return { domain, authProfileId };
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

    private clean(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }
}
