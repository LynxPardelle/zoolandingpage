import type { TTrackOptions } from '@/app/shared/types/analytics.type';
import type {
    TDraftAnalyticsConsentUiMode,
    TDraftAnalyticsRuntimeConfig,
    TDraftAppRuntimeConfig,
    TDraftFeatureRuntimeConfig,
    TDraftLocalStorageRuntimeConfig,
    TDraftLocalStorageSlot,
} from '@/app/shared/types/config-payloads.types';
import { computed, inject, Injectable } from '@angular/core';
import { ConfigStoreService } from './config-store.service';
import { DomainResolverService } from './domain-resolver.service';

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

    readonly siteRuntime = computed(() => this.configStore.siteConfig()?.runtime ?? null);
    readonly app = computed<TDraftAppRuntimeConfig | null>(() => this.siteRuntime()?.app ?? null);
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
        return this.domainResolver.resolveAppIdentifier();
    }

    appMetadata(): TDraftAppRuntimeConfig {
        return this.app() ?? {};
    }

    resolveStorageKey(slot: TDraftLocalStorageSlot): string {
        return this.domainResolver.resolveStorageKey(slot);
    }
}
