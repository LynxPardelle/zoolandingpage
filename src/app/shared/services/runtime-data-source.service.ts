import { Injectable, inject } from '@angular/core';
import type { TRuntimeDataSourceConfig } from '@/app/shared/types/config-payloads.types';
import { RuntimeApiProxyClientService } from './runtime-api-proxy-client.service';
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
    private readonly timers = new Set<ReturnType<typeof setInterval>>();

    async start(options: TRuntimeDataSourceStartOptions): Promise<void> {
        this.stop();

        const sources = (options.dataSources ?? []).filter((source) => source.enabled !== false);
        await Promise.all(sources.map((source) => this.loadSource(options, source)));

        sources.forEach((source) => this.scheduleRefresh(options, source));
    }

    stop(): void {
        this.timers.forEach((timer) => clearInterval(timer));
        this.timers.clear();
    }

    private async loadSource(options: TRuntimeDataSourceStartOptions, source: TRuntimeDataSourceConfig): Promise<void> {
        const sourceId = this.resolveProxySourceId(source);
        this.writeStatus(source, 'loading', null);

        try {
            const response = await this.proxy.readSource({
                domain: options.domain,
                pageId: options.pageId,
                sourceId,
                input: source.input,
            });
            const mapped = this.mapper.mapResponse(response.data, source.mapper);
            this.variables.setRuntimeValue(source.target, mapped);
            this.writeStatus(source, this.hasItems(mapped) ? 'success' : 'empty', null);
        } catch (error) {
            this.writeStatus(source, 'error', error instanceof Error ? error.message : 'API proxy request failed');
        }
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
}
