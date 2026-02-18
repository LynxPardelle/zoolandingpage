import type { TVariablesPayload } from '@/app/shared/types/config-payloads.types';
import { Injectable, signal } from '@angular/core';

export type TVariableMap = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class VariableStoreService {
    private readonly variables = signal<TVariableMap>({});
    private readonly computed = signal<TVariableMap>({});

    setPayload(payload: TVariablesPayload | null): void {
        if (!payload) {
            this.variables.set({});
            this.computed.set({});
            return;
        }
        this.variables.set(payload.variables ?? {});
        this.computed.set(payload.computed ?? {});
    }

    get(path: string): unknown {
        return this.resolvePath(path, this.variables()) ?? this.resolvePath(path, this.computed());
    }

    getOr<T = unknown>(path: string, fallback: T): T {
        const value = this.get(path);
        return value == null ? fallback : (value as T);
    }

    has(path: string): boolean {
        return this.get(path) != null;
    }

    snapshot(): TVariableMap {
        return { ...this.variables(), ...this.computed() };
    }

    private resolvePath(path: string, root: TVariableMap): unknown {
        const parts = String(path ?? '').trim().split('.').filter(Boolean);
        if (!parts.length) return undefined;
        let cur: any = root as any;
        for (const part of parts) {
            if (cur == null || typeof cur !== 'object' || !(part in cur)) return undefined;
            cur = cur[part];
        }
        return cur;
    }
}
