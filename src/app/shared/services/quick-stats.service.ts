import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RuntimeConfigService } from './runtime-config.service';

// Minimal types based on docs/09-quick-stats-lambda.md
export type StatsOp =
    | { op: 'set'; path: string; value: unknown }
    | { op: 'inc'; path: string; by?: number }
    | { op: 'delete'; path: string }
    | { op: 'merge'; path: string; value: Record<string, unknown> }
    | { op: 'append'; path: string; value: unknown };

export interface ApplyOpsRequest {
    appName: string;
    ops: StatsOp[];
    createIfMissing?: boolean;
    dryRun?: boolean;
    ifMatchEtag?: string;
}

export interface ApplyOpsResponse {
    ok: boolean;
    error?: string;
    bucket?: string;
    key?: string;
    stats?: Record<string, unknown>;
    etag?: string;
    versionId?: string;
    dryRun?: boolean;
}

// See docs/09-quick-stats-lambda.md for API details.
@Injectable({ providedIn: 'root' })
export class QuickStatsService {
    private readonly http = inject(HttpClient);
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly endpoint = `${ environment.apiUrl }/quick-stats`;
    private readonly remoteStats = signal<Record<string, unknown> | undefined>(undefined);

    readonly stats = this.remoteStats.asReadonly();

    private resolveAppId(): string {
        return this.runtimeConfig.appIdentifier();
    }

    applyOps(req: ApplyOpsRequest): Observable<ApplyOpsResponse> {
        return this.http.post<ApplyOpsResponse>(this.endpoint, req).pipe(tap(res => {
            if (res.ok && res.stats) {
                this.remoteStats.set(res.stats);
            }
        }));
    }

    inc(path: string, by = 1): Observable<ApplyOpsResponse> {
        return this.applyOps({ appName: this.resolveAppId(), ops: [{ op: 'inc', path, by }] });
    }

    getNumber(path: string): number | undefined {
        const value = this.resolvePath(path, this.remoteStats());
        return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    }

    private resolvePath(path: string, root: Record<string, unknown> | undefined): unknown {
        const parts = String(path ?? '').trim().split('.').filter(Boolean);
        if (!parts.length || !root) return undefined;

        let current: unknown = root;
        for (const part of parts) {
            if (!current || typeof current !== 'object' || Array.isArray(current) || !(part in current)) {
                return undefined;
            }

            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }
}
