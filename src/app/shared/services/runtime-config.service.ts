import type { TTrackOptions } from '@/app/shared/types/analytics.type';
import type {
    TDraftAnalyticsConsentUiMode,
    TDraftAnalyticsRuntimeConfig,
    TDraftAppIdentityVariableConfig,
    TDraftAuthRemoteRuntimeConfig,
    TDraftAuthRuntimeConfig,
    TDraftFeatureRuntimeConfig,
    TDraftHostOverrideConfig,
    TDraftSiteIconConfig,
    TDraftLocalStorageRuntimeConfig,
    TDraftLocalStorageSlot,
    TDraftSiteSeoConfig,
    TDraftSiteConfigPayload,
    TDraftSiteRuntimeConfig,
    TGoogleTagConfig,
    TResolvedAnalyticsConfig,
} from '@/app/shared/types/config-payloads.types';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { isDraftAuthRuntimeConfig } from '../utility/config-validation/config-payload.validators';
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
    private readonly http = inject(HttpClient, { optional: true });
    private readonly remoteAuthResolutions = new Map<string, Promise<boolean>>();
    private readonly _remoteAuthError = signal<string | null>(null);

    readonly siteRuntime = computed(() => this.configStore.siteConfig()?.runtime ?? null);
    readonly appIdentity = computed<TDraftAppIdentityVariableConfig | null>(() => this.variableStore.appIdentity());
    readonly hostOverride = computed<TDraftHostOverrideConfig | null>(() => {
        const host = this.normalizeHost(this.domainResolver.resolveDomain().domain);
        const overrides = this.configStore.siteConfig()?.site?.hostOverrides;
        if (!host || !overrides) {
            return null;
        }

        return Object.entries(overrides).find(([entryHost]) => this.normalizeHost(entryHost) === host)?.[1] ?? null;
    });
    readonly siteSeo = computed<TDraftSiteSeoConfig | null>(() =>
        this.mergeSeoConfig(this.configStore.siteConfig()?.site?.seo, this.hostOverride()?.seo)
    );
    readonly browserIcons = computed<TDraftSiteIconConfig | null>(() => this.configStore.siteConfig()?.site?.icons ?? null);
    readonly auth = computed<TDraftAuthRuntimeConfig | null>(() => this.siteRuntime()?.auth ?? null);
    readonly authRemote = computed<TDraftAuthRemoteRuntimeConfig | null>(() => this.siteRuntime()?.authRemote ?? null);
    readonly remoteAuthError = this._remoteAuthError.asReadonly();
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
    readonly analytics = computed(() => {
        const siteAnalytics: TDraftAnalyticsRuntimeConfig = this.siteRuntime()?.analytics ?? {};
        const loadedAnalytics: TResolvedAnalyticsConfig | null = this.configStore.analytics();
        const siteGoogleTag = this.mergeGoogleTagConfig(siteAnalytics.googleTag, this.hostOverride()?.googleTag);
        const googleTag = this.mergeGoogleTagConfig(siteGoogleTag, loadedAnalytics?.googleTag);
        return {
            ...DEFAULT_ANALYTICS,
            ...siteAnalytics,
            ...(loadedAnalytics ?? {}),
            googleTag,
        };
    });
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

    isAuthEnabled(): boolean {
        return this.auth()?.enabled === true;
    }

    async resolveRemoteAuth(domain: string): Promise<boolean> {
        const remote = this.authRemote();
        if (!remote || remote.enabled !== true) {
            this._remoteAuthError.set(null);
            return true;
        }

        if (this.auth()) {
            this._remoteAuthError.set('remote-auth-ambiguous');
            return false;
        }

        const endpoint = this.cleanString(remote.endpoint);
        const authProfileId = this.cleanString(remote.authProfileId);
        const requestDomain = this.cleanString(domain || this.configStore.siteConfig()?.domain);
        if (!this.http || !endpoint || !authProfileId || !requestDomain) {
            this._remoteAuthError.set('remote-auth-unavailable');
            return false;
        }

        const cacheKey = `${ requestDomain }|${ authProfileId }|${ endpoint }`;
        const existing = this.remoteAuthResolutions.get(cacheKey);
        if (existing) {
            return existing;
        }

        const resolution = this.fetchAndInstallRemoteAuth(endpoint, requestDomain, authProfileId)
            .finally(() => {
                this.remoteAuthResolutions.delete(cacheKey);
            });
        this.remoteAuthResolutions.set(cacheKey, resolution);
        return resolution;
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

    seoDefaults(): TDraftSiteSeoConfig | null {
        return this.siteSeo();
    }

    resolveStorageKey(slot: TDraftLocalStorageSlot): string {
        return this.domainResolver.resolveStorageKey(slot);
    }

    private cleanString(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private async fetchAndInstallRemoteAuth(
        endpoint: string,
        domain: string,
        authProfileId: string,
    ): Promise<boolean> {
        try {
            const response = await firstValueFrom(this.http!.post<unknown>(endpoint, {
                domain,
                authProfileId,
            }));
            const auth = this.extractRemoteAuth(response);
            if (!isDraftAuthRuntimeConfig(auth)) {
                this._remoteAuthError.set('remote-auth-invalid');
                return false;
            }

            if (this.cleanString(auth.authProfileId) !== authProfileId) {
                this._remoteAuthError.set('remote-auth-profile-mismatch');
                return false;
            }

            if (!this.installRemoteAuth(auth, {
                domain,
                authProfileId,
                endpoint,
            })) {
                this._remoteAuthError.set('remote-auth-stale-context');
                return false;
            }

            this._remoteAuthError.set(null);
            return true;
        } catch {
            this._remoteAuthError.set('remote-auth-request-failed');
            return false;
        }
    }

    private extractRemoteAuth(value: unknown): unknown {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        const response = value as Record<string, unknown>;
        if (response['ok'] !== true) {
            return null;
        }

        return response['auth'];
    }

    private installRemoteAuth(
        auth: TDraftAuthRuntimeConfig,
        expected: {
            readonly domain: string;
            readonly authProfileId: string;
            readonly endpoint: string;
        },
    ): boolean {
        const siteConfig = this.configStore.siteConfig();
        if (!siteConfig) {
            return false;
        }

        if (this.cleanString(siteConfig.domain) !== expected.domain) {
            return false;
        }

        const runtime = siteConfig.runtime ?? {};
        const remote = runtime.authRemote;
        if (!remote || runtime.auth) {
            return false;
        }

        if (
            remote.enabled !== true
            || this.cleanString(remote.authProfileId) !== expected.authProfileId
            || this.cleanString(remote.endpoint) !== expected.endpoint
        ) {
            return false;
        }

        const { authRemote: _authRemote, ...runtimeWithoutRemote } = runtime as TDraftSiteRuntimeConfig & Record<string, unknown>;
        const nextConfig: TDraftSiteConfigPayload = {
            ...siteConfig,
            runtime: {
                ...runtimeWithoutRemote,
                auth,
            },
        };

        this.configStore.setSiteConfig(nextConfig);
        return true;
    }

    private normalizeHost(value: unknown): string {
        return this.cleanString(value).toLowerCase().replace(/:\d+$/, '');
    }

    private mergeSeoConfig(
        base: TDraftSiteSeoConfig | null | undefined,
        override: TDraftSiteSeoConfig | null | undefined,
    ): TDraftSiteSeoConfig | null {
        if (!base && !override) {
            return null;
        }

        return {
            ...(base ?? {}),
            ...(override ?? {}),
            openGraph: {
                ...(base?.openGraph ?? {}),
                ...(override?.openGraph ?? {}),
            },
            twitter: {
                ...(base?.twitter ?? {}),
                ...(override?.twitter ?? {}),
            },
        };
    }

    private mergeGoogleTagConfig(
        base: TGoogleTagConfig | null | undefined,
        override: TGoogleTagConfig | null | undefined,
    ): TGoogleTagConfig | undefined {
        if (!base && !override) {
            return undefined;
        }

        return {
            ...(base ?? {}),
            ...(override ?? {}),
            environments: {
                ...(base?.environments ?? {}),
                ...(override?.environments ?? {}),
            },
            attribution: {
                ...(base?.attribution ?? {}),
                ...(override?.attribution ?? {}),
            },
            events: {
                ...(base?.events ?? {}),
                ...(override?.events ?? {}),
            },
            conversions: {
                ...(base?.conversions ?? {}),
                ...(override?.conversions ?? {}),
            },
        };
    }

    private sanitizeIdentifier(value: unknown): string {
        return this.cleanString(value)
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_]+/g, '');
    }
}
