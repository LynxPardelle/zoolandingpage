import { environment } from '@/environments/environment';
import { computed, DestroyRef, inject, Injectable, REQUEST, signal } from '@angular/core';
import { DomainResolverService } from './domain-resolver.service';
import { DraftRegistryService, TDraftRegistryEntry } from './draft-registry.service';

export type TDraftOption = TDraftRegistryEntry & {
    readonly key: string;
    readonly label: string;
};

@Injectable({ providedIn: 'root' })
export class DraftRuntimeService {
    private readonly draftRefreshIntervalMs = 5000;
    private readonly request = inject(REQUEST, { optional: true });
    private readonly draftRegistry = inject(DraftRegistryService);
    private readonly domainResolver = inject(DomainResolverService);

    readonly availableDrafts = signal<readonly TDraftRegistryEntry[]>([]);
    readonly draftRegistryLoading = signal(false);
    readonly activeDraftDomain = computed(() => this.domainResolver.resolveDomain().domain || environment.drafts.defaultDomain);
    readonly activeDraftPageId = computed(() => this.resolveDraftPageId());
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

        if (!entries.some((entry) => this.composeDraftKey(entry.domain, entry.pageId) === activeKey)) {
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

    initRegistryAutoRefresh(destroyRef: DestroyRef): void {
        if (!environment.features.debugMode || !environment.drafts.enabled || typeof window === 'undefined') {
            return;
        }

        this.refreshRegistry();
        const timerId = window.setInterval(() => this.refreshRegistry(), this.draftRefreshIntervalMs);
        destroyRef.onDestroy(() => window.clearInterval(timerId));
    }

    refreshRegistry(): void {
        if (!environment.features.debugMode || !environment.drafts.enabled || typeof window === 'undefined') {
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

    selectDraftByKey(key: string): void {
        const selected = this.parseDraftKey(key);
        if (!selected || typeof window === 'undefined') {
            return;
        }

        const nextUrl = this.draftPreviewUrl(selected.domain, selected.pageId);
        const currentUrl = `${ window.location.pathname }${ window.location.search }${ window.location.hash }`;
        if (nextUrl === currentUrl) {
            return;
        }

        window.location.assign(nextUrl);
    }

    draftPreviewUrl(domain: string, pageId: string): string {
        const normalizedDomain = String(domain).trim() || environment.drafts.defaultDomain;
        const normalizedPageId = String(pageId).trim() || environment.drafts.defaultPageId;

        if (typeof window === 'undefined' || !window.location) {
            return `/?draftDomain=${ encodeURIComponent(normalizedDomain) }&draftPageId=${ encodeURIComponent(normalizedPageId) }`;
        }

        const url = new URL(window.location.href);
        url.searchParams.set('draftDomain', normalizedDomain);
        url.searchParams.set('draftPageId', normalizedPageId);
        return `${ url.pathname }${ url.search }${ url.hash }`;
    }

    private resolveDraftPageId(): string {
        const fallback = environment.drafts.defaultPageId;
        if (typeof window === 'undefined' || !window.location?.search) {
            const requestUrl = String(this.request?.url ?? '').trim();
            if (!requestUrl) {
                return fallback;
            }

            try {
                const value = new URL(requestUrl).searchParams.get('draftPageId');
                const next = String(value ?? '').trim();
                return next.length > 0 ? next : fallback;
            } catch {
                return fallback;
            }
        }

        const value = new URLSearchParams(window.location.search).get('draftPageId');
        const next = String(value ?? '').trim();
        return next.length > 0 ? next : fallback;
    }

    private composeDraftKey(domain: string, pageId: string): string {
        return `${ String(domain).trim() }::${ String(pageId).trim() }`;
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
        return `${ entry.domain } / ${ entry.pageId }`;
    }
}
