import { environment } from '@/environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, NgZone, PLATFORM_ID, REQUEST, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { TDraftSiteConfigPayload, TDraftSiteRouteEntry } from '../types/config-payloads.types';
import { ConfigSourceService } from './config-source.service';
import { DomainResolverService } from './domain-resolver.service';
import { DraftRegistryService, TDraftRegistryEntry } from './draft-registry.service';

export const DRAFT_RUNTIME_STICKY_QUERY_PARAMS = ['debugWorkspace'] as const;

export type TDraftOption = TDraftRegistryEntry & {
    readonly key: string;
    readonly label: string;
};

export type TResolvedDraftContext = {
    readonly domain: string;
    readonly pageId: string;
    readonly path: string;
    readonly route: TDraftSiteRouteEntry | null;
    readonly explicitPageId: boolean;
};

@Injectable({ providedIn: 'root' })
export class DraftRuntimeService {
    private readonly draftRefreshIntervalMs = 5000;
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly zone = inject(NgZone);
    private readonly router = inject(Router);
    private readonly draftRegistry = inject(DraftRegistryService);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly configSource = inject(ConfigSourceService);
    private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

    readonly availableDrafts = signal<readonly TDraftRegistryEntry[]>([]);
    readonly draftRegistryLoading = signal(false);
    private readonly locationRevision = signal(0);
    readonly resolvedDraftPageId = signal('');
    readonly resolvedDraftPath = signal('/');
    readonly resolvedDraftRoute = signal<TDraftSiteRouteEntry | null>(null);
    readonly activeDraftDomain = computed(() => {
        this.locationRevision();
        return this.domainResolver.resolveDomain().domain;
    });
    readonly requestedDraftPageId = computed(() => {
        this.locationRevision();
        return this.resolveRequestedDraftPageId();
    });
    readonly activeDraftPageId = computed(() => this.resolvedDraftPageId() || this.requestedDraftPageId());
    readonly selectedDraftKey = computed(() => this.composeDraftKey(this.activeDraftDomain(), this.activeDraftPageId()));
    readonly activeDraftLabel = computed(() => this.formatDraftLabel({
        domain: this.activeDraftDomain(),
        pageId: this.activeDraftPageId(),
    }));
    readonly draftOptions = computed<readonly TDraftOption[]>(() => {
        const entries = [...this.availableDrafts()];
        const active = {
            domain: this.activeDraftDomain(),
            pageId: this.activeDraftPageId(),
        };
        const activeKey = this.composeDraftKey(active.domain, active.pageId);

        if (activeKey && !entries.some((entry) => this.composeDraftKey(entry.domain, entry.pageId) === activeKey)) {
            entries.push(active);
        }

        return entries
            .map((entry) => ({
                ...entry,
                key: this.composeDraftKey(entry.domain, entry.pageId),
                label: this.formatDraftLabel(entry),
            }))
            .sort((left, right) => left.label.localeCompare(right.label));
    });

    private parseRequestUrl(): URL | null {
        const requestUrl = String(this.request?.url ?? '').trim();
        if (!requestUrl) {
            return null;
        }

        try {
            return new URL(requestUrl, 'http://localhost');
        } catch {
            return null;
        }
    }

    initRegistryAutoRefresh(destroyRef: DestroyRef): void {
        if (!environment.features.debugMode || !environment.drafts.enabled || !this.isBrowser) {
            return;
        }

        this.refreshRegistry();
        const timerId = this.zone.runOutsideAngular(() => window.setInterval(
            () => this.zone.run(() => this.refreshRegistry()),
            this.draftRefreshIntervalMs,
        ));
        destroyRef.onDestroy(() => window.clearInterval(timerId));
    }

    refreshRegistry(): void {
        if (!environment.features.debugMode || !environment.drafts.enabled || !this.isBrowser) {
            return;
        }

        this.draftRegistryLoading.set(true);
        this.draftRegistry.listDrafts().subscribe({
            next: (entries: readonly TDraftRegistryEntry[]) => {
                this.availableDrafts.set(entries);
                this.draftRegistryLoading.set(false);
            },
            error: () => {
                this.draftRegistryLoading.set(false);
            },
        });
    }

    async resolveActiveDraftContext(): Promise<TResolvedDraftContext> {
        this.invalidateLocationState();
        const domain = this.activeDraftDomain();
        const explicitPageId = this.hasExplicitDraftPageId();
        const path = this.resolvePathname();

        if (explicitPageId) {
            const explicitContext = {
                domain,
                pageId: this.requestedDraftPageId(),
                path,
                route: null,
                explicitPageId: true,
            } satisfies TResolvedDraftContext;
            this.applyResolvedContext(explicitContext);
            return explicitContext;
        }

        const siteConfig = await this.loadSiteConfig(domain);
        const route = this.matchRoute(siteConfig, path);
        const resolvedContext = {
            domain,
            pageId: route?.pageId || siteConfig?.defaultPageId || this.requestedDraftPageId(),
            path,
            route,
            explicitPageId: false,
        } satisfies TResolvedDraftContext;

        this.applyResolvedContext(resolvedContext);
        return resolvedContext;
    }

    selectDraftByKey(key: string): void {
        const selected = this.parseDraftKey(key);
        if (!selected || !this.isBrowser) {
            return;
        }

        const nextUrl = this.draftPreviewUrl(selected.domain, selected.pageId);
        const currentUrl = `${ window.location.pathname }${ window.location.search }${ window.location.hash }`;
        if (nextUrl === currentUrl) {
            return;
        }

        void this.router.navigateByUrl(nextUrl).catch(() => window.location.assign(nextUrl));
    }

    draftPreviewUrl(domain: string, pageId: string): string {
        const normalizedDomain = String(domain).trim();
        const normalizedPageId = String(pageId).trim();

        if (!this.isBrowser || !window.location) {
            return `/?draftDomain=${ encodeURIComponent(normalizedDomain) }&draftPageId=${ encodeURIComponent(normalizedPageId) }`;
        }

        const url = new URL(window.location.href);
        url.searchParams.set('draftDomain', normalizedDomain);
        url.searchParams.set('draftPageId', normalizedPageId);
        return `${ url.pathname }${ url.search }${ url.hash }`;
    }

    hasDebugWorkspaceEnabled(): boolean {
        if (environment.features.debugMode && environment.drafts.enabled && this.isLocalDraftSelectionRequired()) {
            return true;
        }

        if (!this.isBrowser || !window.location?.search) {
            const requestUrl = this.parseRequestUrl();
            if (!requestUrl) {
                return false;
            }

            return requestUrl.searchParams.has('debugWorkspace');
        }

        return new URLSearchParams(window.location.search).has('debugWorkspace');
    }

    hasResolvedActiveDraftIdentity(): boolean {
        return this.resolveDraftIdentityCandidate().resolved;
    }

    private invalidateLocationState(): void {
        this.locationRevision.update((value) => value + 1);
    }

    private resolveDraftIdentityCandidate(): { resolved: boolean; localHost: boolean } {
        const resolvedDomain = this.domainResolver.resolveDomain().domain;
        const requestedPageId = this.resolveRequestedDraftPageId();
        const requestUrl = this.parseRequestUrl();
        const browserHost = this.isBrowser ? String(window.location?.hostname ?? '').trim() : '';
        const requestHost = String(requestUrl?.hostname ?? '').trim();
        const host = browserHost || requestHost;
        const localHost = host.length > 0 && (host === 'localhost' || host === '127.0.0.1' || host === '::1');

        return {
            resolved: resolvedDomain.length > 0 && requestedPageId.length > 0,
            localHost,
        };
    }

    private isLocalDraftSelectionRequired(): boolean {
        const candidate = this.resolveDraftIdentityCandidate();
        return candidate.localHost && !candidate.resolved;
    }

    private resolveRequestedDraftPageId(): string {
        if (!this.isBrowser || !window.location?.search) {
            const requestUrl = this.parseRequestUrl();
            if (!requestUrl) {
                return '';
            }

            const value = requestUrl.searchParams.get('draftPageId');
            const next = String(value ?? '').trim();
            return next;
        }

        const value = new URLSearchParams(window.location.search).get('draftPageId');
        const next = String(value ?? '').trim();
        return next;
    }

    private hasExplicitDraftPageId(): boolean {
        if (!this.isBrowser || !window.location?.search) {
            const requestUrl = this.parseRequestUrl();
            if (!requestUrl) {
                return false;
            }

            const value = requestUrl.searchParams.get('draftPageId');
            return String(value ?? '').trim().length > 0;
        }

        return String(new URLSearchParams(window.location.search).get('draftPageId') ?? '').trim().length > 0;
    }

    private resolvePathname(): string {
        if (this.isBrowser && window.location?.pathname) {
            return this.normalizePath(window.location.pathname);
        }

        const requestUrl = this.parseRequestUrl();
        if (!requestUrl) {
            return '/';
        }

        return this.normalizePath(requestUrl.pathname);
    }

    private normalizePath(path: string): string {
        const trimmed = String(path ?? '').trim();
        if (!trimmed) return '/';

        let normalized = trimmed;
        try {
            normalized = decodeURIComponent(trimmed);
        } catch {
            normalized = trimmed;
        }

        normalized = normalized.replace(/\\+/g, '/');
        if (!normalized.startsWith('/')) normalized = `/${ normalized }`;
        normalized = normalized.replace(/\/+/g, '/');
        if (normalized.length > 1) {
            normalized = normalized.replace(/\/+$/, '');
        }

        return normalized || '/';
    }

    private async loadSiteConfig(domain: string): Promise<TDraftSiteConfigPayload | null> {
        if (!domain) {
            return null;
        }

        return this.configSource.loadSiteConfig(domain);
    }

    private matchRoute(siteConfig: TDraftSiteConfigPayload | null, path: string): TDraftSiteRouteEntry | null {
        if (!siteConfig?.routes?.length) {
            return null;
        }

        const normalizedPath = this.normalizePath(path);
        return siteConfig.routes.find((entry) => this.normalizePath(entry.path) === normalizedPath) ?? null;
    }

    private applyResolvedContext(context: TResolvedDraftContext): void {
        this.resolvedDraftPageId.set(context.pageId);
        this.resolvedDraftPath.set(context.path);
        this.resolvedDraftRoute.set(context.route);
    }

    private composeDraftKey(domain: string, pageId: string): string {
        const normalizedDomain = String(domain).trim();
        const normalizedPageId = String(pageId).trim();
        if (!normalizedDomain || !normalizedPageId) {
            return '';
        }

        return `${ normalizedDomain }::${ normalizedPageId }`;
    }

    private parseDraftKey(key: string): TDraftRegistryEntry | null {
        const [domain = '', pageId = ''] = String(key).split('::');
        const normalizedDomain = domain.trim();
        const normalizedPageId = pageId.trim();

        if (!normalizedDomain || !normalizedPageId) {
            return null;
        }

        return {
            domain: normalizedDomain,
            pageId: normalizedPageId,
        };
    }

    private formatDraftLabel(entry: TDraftRegistryEntry): string {
        if (!entry.domain || !entry.pageId) {
            return 'Unresolved draft';
        }

        return `${ entry.domain } / ${ entry.pageId }`;
    }
}
