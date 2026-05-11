import { Injectable, REQUEST, inject } from '@angular/core';
import type { TRuntimeDataSourceConfig } from '@/app/shared/types/config-payloads.types';
import { RuntimeApiProxyClientService, type TRuntimeApiProxyResponse } from './runtime-api-proxy-client.service';
import { RuntimeDataSourceMapperService } from './runtime-data-source-mapper.service';
import { VariableStoreService } from './variable-store.service';

export type TRuntimeDataSourceStartOptions = {
    readonly domain: string;
    readonly pageId?: string;
    readonly dataSources?: readonly TRuntimeDataSourceConfig[] | null;
};

type TRemoteStatusState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

@Injectable({ providedIn: 'root' })
export class RuntimeDataSourceService {
    private readonly proxy = inject(RuntimeApiProxyClientService);
    private readonly mapper = inject(RuntimeDataSourceMapperService);
    private readonly variables = inject(VariableStoreService);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly timers = new Set<ReturnType<typeof setInterval>>();
    private readonly loadRetryDelaysMs = [150, 500];

    async start(options: TRuntimeDataSourceStartOptions): Promise<void> {
        this.stop();

        const sources = (options.dataSources ?? [])
            .filter((source) => source.enabled !== false)
            .filter((source) => this.matchesActivePage(source, options.pageId));
        await this.loadInitialSources(options, sources);

        sources.forEach((source) => this.scheduleRefresh(options, source));
    }

    stop(): void {
        this.timers.forEach((timer) => clearInterval(timer));
        this.timers.clear();
    }

    private async loadSource(options: TRuntimeDataSourceStartOptions, source: TRuntimeDataSourceConfig): Promise<void> {
        const sourceId = this.resolveProxySourceId(source);
        const input = this.resolveInput(source.input);
        if (!this.hasRequiredInputValues(source.requiredInputKeys, input)) {
            return;
        }
        this.writeStatus(source, 'loading', null);

        try {
            const response = await this.readSourceWithRetry(options, sourceId, input);
            const mapped = this.mapper.mapResponse(response.data, source.mapper);
            this.writeMappedResult(source, mapped);
            this.writeStatus(source, this.hasItems(mapped) ? 'success' : 'empty', null);
        } catch (error) {
            this.writeStatus(source, 'error', error instanceof Error ? error.message : 'API proxy request failed');
        }
    }

    private async loadInitialSources(
        options: TRuntimeDataSourceStartOptions,
        sources: readonly TRuntimeDataSourceConfig[],
    ): Promise<void> {
        for (const source of sources) {
            await this.loadSource(options, source);
        }
    }

    private async readSourceWithRetry(
        options: TRuntimeDataSourceStartOptions,
        sourceId: string,
        input: Record<string, unknown> | undefined,
    ): Promise<TRuntimeApiProxyResponse<unknown>> {
        let lastError: unknown;
        const attempts = this.loadRetryDelaysMs.length + 1;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.proxy.readSource({
                    domain: options.domain,
                    pageId: options.pageId,
                    sourceId,
                    input,
                });
            } catch (error) {
                lastError = error;
                if (attempt >= this.loadRetryDelaysMs.length) {
                    break;
                }
                await this.wait(this.loadRetryDelaysMs[attempt]);
            }
        }

        throw lastError instanceof Error ? lastError : new Error('API proxy request failed');
    }

    private wait(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private scheduleRefresh(options: TRuntimeDataSourceStartOptions, source: TRuntimeDataSourceConfig): void {
        if (source.refresh?.mode !== 'interval') return;

        const intervalMs = Number(source.refresh.intervalMs ?? 0);
        if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

        const timer = setInterval(() => {
            void this.loadSource(options, source);
        }, intervalMs);
        this.timers.add(timer);
    }

    private resolveProxySourceId(source: TRuntimeDataSourceConfig): string {
        return String(source.proxySourceId || source.id).trim();
    }

    private matchesActivePage(source: TRuntimeDataSourceConfig, pageId: string | undefined): boolean {
        if (!Array.isArray(source.pageIds) || source.pageIds.length === 0) {
            return true;
        }

        const normalizedPageId = String(pageId ?? '').trim();
        if (!normalizedPageId) {
            return false;
        }

        return source.pageIds.some((entry) => String(entry ?? '').trim() === normalizedPageId);
    }

    private hasRequiredInputValues(
        requiredKeys: readonly string[] | undefined,
        input: Record<string, unknown> | undefined,
    ): boolean {
        if (!Array.isArray(requiredKeys) || requiredKeys.length === 0) {
            return true;
        }

        return requiredKeys
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
            .every((key) => this.hasResolvedInputValue(input?.[key]));
    }

    private hasResolvedInputValue(value: unknown): boolean {
        if (value == null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    }

    private resolveInput(input: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            return undefined;
        }

        return Object.entries(input).reduce<Record<string, unknown>>((acc, [key, value]) => {
            const resolved = this.resolveInputValue(value);
            if (resolved !== undefined) {
                acc[key] = resolved;
            }
            return acc;
        }, {});
    }

    private resolveInputValue(value: unknown): unknown {
        if (!this.isInputResolver(value)) {
            return value;
        }

        let resolved: unknown;
        if (value.source === 'literal') {
            resolved = Object.prototype.hasOwnProperty.call(value, 'value') ? value.value : value.fallback;
        } else if (value.source === 'queryParam') {
            resolved = this.readQueryParam(String(value.key ?? '')) ?? value.fallback;
        } else {
            resolved = this.variables.get(String(value.path ?? '')) ?? value.fallback;
        }

        return this.applyInputTransforms(resolved, value.transforms);
    }

    private isInputResolver(value: unknown): value is {
        readonly source: 'literal' | 'queryParam' | 'var';
        readonly key?: string;
        readonly path?: string;
        readonly value?: unknown;
        readonly fallback?: unknown;
        readonly transforms?: readonly string[];
    } {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }

        const source = (value as { readonly source?: unknown }).source;
        if (source === 'literal') {
            return true;
        }
        if (source === 'queryParam') {
            return typeof (value as { readonly key?: unknown }).key === 'string';
        }
        if (source === 'var') {
            return typeof (value as { readonly path?: unknown }).path === 'string';
        }
        return false;
    }

    private applyInputTransforms(value: unknown, transforms: readonly string[] | undefined): unknown {
        if (!Array.isArray(transforms) || transforms.length === 0 || value == null) {
            return value;
        }

        return transforms.reduce<unknown>((current, transform) => {
            if (current == null) {
                return current;
            }

            const text = String(current);
            switch (transform) {
                case 'trim':
                    return text.trim();
                case 'lowercase':
                    return text.toLowerCase();
                case 'uppercase':
                    return text.toUpperCase();
                default:
                    return current;
            }
        }, value);
    }

    private readQueryParam(key: string): string | undefined {
        const normalizedKey = String(key ?? '').trim();
        if (!normalizedKey) {
            return undefined;
        }

        const params = this.currentSearchParams();
        return params?.get(normalizedKey) ?? undefined;
    }

    private currentSearchParams(): URLSearchParams | null {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (requestUrl) {
            try {
                return new URL(requestUrl, 'http://localhost').searchParams;
            } catch {
                return null;
            }
        }

        if (typeof window !== 'undefined' && window.location?.search) {
            return new URLSearchParams(window.location.search);
        }

        return null;
    }

    private writeStatus(source: TRuntimeDataSourceConfig, state: TRemoteStatusState, error: string | null): void {
        this.variables.setRuntimeValue(source.statusTarget || `remoteStatus.${ source.id }`, {
            state,
            updatedAt: state === 'loading' ? null : new Date().toISOString(),
            error,
        });
    }

    private hasItems(value: unknown): boolean {
        return !!value
            && typeof value === 'object'
            && Array.isArray((value as { readonly items?: unknown }).items)
            && ((value as { readonly items: readonly unknown[] }).items.length > 0);
    }

    private writeMappedResult(source: TRuntimeDataSourceConfig, mapped: { readonly items: readonly unknown[] }): void {
        if (source.mergeMode !== 'appendItems') {
            this.variables.setRuntimeValue(source.target, mapped);
            return;
        }

        const existing = this.variables.get(source.target);
        const existingItems = this.extractItems(existing);
        this.variables.setRuntimeValue(source.target, {
            ...(this.isRecord(existing) ? existing : {}),
            items: this.mergeItemsByIdentity(existingItems, mapped.items),
        });
    }

    private extractItems(value: unknown): readonly unknown[] {
        return value && typeof value === 'object' && Array.isArray((value as { readonly items?: unknown }).items)
            ? (value as { readonly items: readonly unknown[] }).items
            : [];
    }

    private mergeItemsByIdentity(
        existingItems: readonly unknown[],
        incomingItems: readonly unknown[],
    ): readonly unknown[] {
        const merged = new Map<string, unknown>();

        [...existingItems, ...incomingItems].forEach((item, index) => {
            const key = this.resolveItemIdentity(item) ?? `index:${ index }`;
            const previous = merged.get(key);
            merged.set(key, this.mergeItemRecords(previous, item));
        });

        return Array.from(merged.values());
    }

    private resolveItemIdentity(item: unknown): string | undefined {
        if (!this.isRecord(item)) return undefined;

        const candidate = item['name'] ?? item['id'] ?? item['href'] ?? item['url'];
        const normalized = String(candidate ?? '').trim().toLowerCase();
        return normalized ? normalized : undefined;
    }

    private mergeItemRecords(base: unknown, override: unknown): unknown {
        if (!this.isRecord(base) || !this.isRecord(override)) {
            return override ?? base;
        }

        return {
            ...base,
            ...Object.fromEntries(
                Object.entries(override).filter(([, value]) => value !== undefined && value !== null && value !== ''),
            ),
        };
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }
}
