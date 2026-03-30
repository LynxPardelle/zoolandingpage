import type {
    TDraftAppIdentityVariableConfig,
    TDraftBrandVariableConfig,
    TDraftCtaTargetsVariableConfig,
    TDraftHeroAssetsVariableConfig,
    TDraftNavigationVariableConfig,
    TDraftSocialLinkConfig,
    TDraftUiVariableConfig,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import type { TThemeVariableConfig } from '@/app/shared/types/theme.types';
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

    getString(path: string, fallback = ''): string {
        const value = this.get(path);
        return typeof value === 'string' ? value.trim() : fallback;
    }

    getRecord<T extends Record<string, unknown> = Record<string, unknown>>(path: string): T | null {
        const value = this.get(path);
        return this.isRecord(value) ? value as T : null;
    }

    getArray<T = unknown>(path: string): readonly T[] {
        const value = this.get(path);
        return Array.isArray(value) ? value as readonly T[] : [];
    }

    appIdentity(): TDraftAppIdentityVariableConfig | null {
        return this.getRecord<TDraftAppIdentityVariableConfig>('appIdentity');
    }

    brand(): TDraftBrandVariableConfig | null {
        return this.getRecord<TDraftBrandVariableConfig>('brand');
    }

    heroAssets(): TDraftHeroAssetsVariableConfig | null {
        return this.getRecord<TDraftHeroAssetsVariableConfig>('heroAssets');
    }

    ctaTargets(): TDraftCtaTargetsVariableConfig {
        return this.getRecord<TDraftCtaTargetsVariableConfig>('ctaTargets') ?? {};
    }

    navigation(): TDraftNavigationVariableConfig {
        return this.getArray<Record<string, unknown>>('navigation');
    }

    socialLinks(): readonly TDraftSocialLinkConfig[] {
        return this.getArray<TDraftSocialLinkConfig>('socialLinks');
    }

    theme(): TThemeVariableConfig | null {
        return this.getRecord<TThemeVariableConfig>('theme');
    }

    ui(): TDraftUiVariableConfig | null {
        return this.getRecord<TDraftUiVariableConfig>('ui');
    }

    snapshot(): TVariableMap {
        return { ...this.variables(), ...this.computed() };
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
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
