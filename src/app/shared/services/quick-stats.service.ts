import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

// Minimal types based on docs/09-quick-stats-lambda.md
export type StatsOp =
    | { op: 'set'; path: string; value: any }
    | { op: 'inc'; path: string; by?: number }
    | { op: 'delete'; path: string }
    | { op: 'merge'; path: string; value: Record<string, any> }
    | { op: 'append'; path: string; value: any };

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
    stats?: Record<string, any>;
    etag?: string;
    versionId?: string;
    dryRun?: boolean;
}

// See docs/09-quick-stats-lambda.md for API details.
@Injectable({ providedIn: 'root' })
export class QuickStatsService {
    private http = inject(HttpClient);
    // Keep centralized in one place so we can append a path later (e.g., `/v1/quick-stats`)
    private readonly baseUrl = `${ environment.apiUrl }`;
    private readonly appId = (environment.app.name || 'zoolandingpage').replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]+/g, '').toLowerCase();
    private readonly version: string = environment.apiVersion;
    public readonly remoteStats = signal<Record<string, any> | undefined>(undefined);

    /** Send raw ops to the backend */
    applyOps(req: ApplyOpsRequest): Observable<ApplyOpsResponse> {
        /* const url = `${ this.baseUrl }/${ this.version }/quick-stats`; */
        const url = `${ this.baseUrl }/quick-stats`;
        return this.http.post<ApplyOpsResponse>(url, req).pipe(tap(res => {
            if (res.ok && res.stats) {
                this.remoteStats.set(res.stats);
            }
        }));
    }

    /** Convenience: fetch current stats document (no write) */
    readStats(ifMatchEtag?: string): Observable<ApplyOpsResponse> {
        return this.applyOps({ appName: this.appId, ops: [], dryRun: true, ifMatchEtag });
    }

    /** Convenience: increment a counter path by N (default 1) */
    inc(path: string, by = 1): Observable<ApplyOpsResponse> {
        return this.applyOps({ appName: this.appId, ops: [{ op: 'inc', path, by }] });
    }

    /** Convenience: set a value at a path */
    set(path: string, value: any): Observable<ApplyOpsResponse> {
        return this.applyOps({ appName: this.appId, ops: [{ op: 'set', path, value }] });
    }

    /** Convenience: deep-merge an object at a path */
    merge(path: string, value: Record<string, any>): Observable<ApplyOpsResponse> {
        return this.applyOps({ appName: this.appId, ops: [{ op: 'merge', path, value }] });
    }

    /** Convenience: append a value into an array at a path */
    append(path: string, value: any): Observable<ApplyOpsResponse> {
        return this.applyOps({ appName: this.appId, ops: [{ op: 'append', path, value }] });
    }

    /** Specific helpers used by the app */
    incPageView(): Observable<ApplyOpsResponse> {
        return this.inc('metrics.pageViews', 1);
    }

    incCtaClick(): Observable<ApplyOpsResponse> {
        return this.inc('metrics.ctaClicks', 1);
    }
}
