import type { TTrackOptions } from '@/app/shared/types/analytics.type';
import type {
    TDraftAnalyticsConsentUiMode,
    TDraftAnalyticsRuntimeConfig,
    TDraftAppIdentityVariableConfig,
    TDraftFeatureRuntimeConfig,
    TDraftLocalStorageRuntimeConfig,
    TDraftLocalStorageSlot,
} from '@/app/shared/types/config-payloads.types';
import { computed, inject, Injectable } from '@angular/core';
import { ConfigStoreService } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';
import { VariableStoreService } from './variable-store.service';

const DEFAULT_FEATURES: Required<TDraftFeatureRuntimeConfig> = {
    debugMode: false,
};

const DEFAULT_ANALYTICS: Required<Pick<TDraftAnalyticsRuntimeConfig,
    'enabled'
    | 'consentUI'
    | 'consentSnoozeSeconds'
>> = {
    enabled: false,
    consentUI: 'none',
    consentSnoozeSeconds: 86400,
};

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
    private readonly configStore = inject(ConfigStoreService);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly variableStore = inject(VariableStoreService);

    readonly siteRuntime = computed(() => this.configStore.siteConfig()?.runtime ?? null);
    readonly appIdentity = computed<TDraftAppIdentityVariableConfig | null>(() => this.variableStore.appIdentity());
    readonly brand = computed(() => this.variableStore.brand());
    readonly heroAssets = computed(() => this.variableStore.heroAssets());
    readonly ctaTargets = computed(() => this.variableStore.ctaTargets());
    readonly navigation = computed(() => this.variableStore.navigation());
    readonly socialLinks = computed(() => this.variableStore.socialLinks());
    readonly localStorage = computed<TDraftLocalStorageRuntimeConfig>(() => this.siteRuntime()?.localStorage ?? {});
    readonly features = computed<Required<TDraftFeatureRuntimeConfig>>(() => ({
        ...DEFAULT_FEATURES,
        ...(this.siteRuntime()?.features ?? {}),
    }));
    readonly analytics = computed(() => ({
        ...DEFAULT_ANALYTICS,
        ...(this.siteRuntime()?.analytics ?? {}),
        ...(this.configStore.analytics() ?? {}),
    }));
    readonly track = computed<readonly TTrackOptions[]>(() => {
        const value = this.analytics().track;
        return Array.isArray(value) ? value : [];
    });

    isAnalyticsEnabled(): boolean {
        return this.analytics().enabled;
    }

    isDebugMode(): boolean {
        return this.features().debugMode;
    }

    analyticsConsentMode(): TDraftAnalyticsConsentUiMode {
        return this.analytics().consentUI;
    }

    analyticsConsentSnoozeSeconds(): number {
        return this.analytics().consentSnoozeSeconds;
    }

    appIdentifier(): string {
        const appIdentity = this.appIdentity();

        return this.sanitizeIdentifier(appIdentity?.identifier)
            || this.sanitizeIdentifier(appIdentity?.name)
            || this.sanitizeIdentifier(this.domainResolver.resolveDomain().domain)
            || 'app';
    }

    appName(): string {
        const name = this.cleanString(this.appIdentity()?.name);
        return name || this.domainResolver.resolveDomain().domain || 'app';
    }

    appDescription(): string {
        return this.cleanString(this.appIdentity()?.description);
    }

    appMetadata(): TDraftAppIdentityVariableConfig {
        return this.appIdentity() ?? {};
    }

    resolveStorageKey(slot: TDraftLocalStorageSlot): string {
        return this.domainResolver.resolveStorageKey(slot);
    }

    private cleanString(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private sanitizeIdentifier(value: unknown): string {
        return this.cleanString(value)
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]+/g, '');
    }
}
