import type { TAngoraCombosPayload, TComboCatalogRuntimeConfig } from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, REQUEST } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { isAngoraCombosPayload } from '../utility/config-validation/config-payload.validators';
import { buildAuthEndpointUrl } from '../utility/auth/auth-api-url.utility';
import { AngoraCombosService } from './angora-combos.service';
import { ConfigStoreService } from './config-store.service';

type TComboCatalogRuntimeResponse = {
    readonly ok?: boolean;
    readonly data?: {
        readonly combos?: Record<string, readonly string[]>;
    };
};

const COMBO_CATALOG_SCOPE = 'combo-catalog';

@Injectable({ providedIn: 'root' })
export class ComboCatalogRuntimeService {
    private readonly configStore = inject(ConfigStoreService);
    private readonly combos = inject(AngoraCombosService);
    private readonly http = inject(HttpClient, { optional: true });
    private readonly request = inject(REQUEST, { optional: true });
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly resolutions = new Map<string, Promise<boolean>>();

    async load(domain: string, pageId: string): Promise<boolean> {
        const config = this.configStore.siteConfig()?.runtime?.comboCatalog;
        if (!config || config.enabled !== true) {
            this.combos.clearAuxiliaryCombos(COMBO_CATALOG_SCOPE);
            return true;
        }

        if (!this.isBrowser || !this.http) {
            return true;
        }

        const endpoint = this.cleanString(config.endpoint);
        const requestDomain = this.cleanString(domain || this.configStore.siteConfig()?.domain);
        const requestPageId = this.cleanString(pageId || this.configStore.pageConfig()?.pageId);
        if (!endpoint || !requestDomain || !requestPageId) {
            this.combos.clearAuxiliaryCombos(COMBO_CATALOG_SCOPE);
            return false;
        }

        const cacheKey = [
            requestDomain,
            requestPageId,
            this.cleanString(config.authProfileId),
            this.cleanString(config.draftDomain),
            endpoint,
        ].join('|');
        const existing = this.resolutions.get(cacheKey);
        if (existing) return existing;

        const resolution = this.fetchAndInstall(config, requestDomain, requestPageId)
            .finally(() => this.resolutions.delete(cacheKey));
        this.resolutions.set(cacheKey, resolution);
        return resolution;
    }

    private async fetchAndInstall(
        config: TComboCatalogRuntimeConfig,
        domain: string,
        pageId: string,
    ): Promise<boolean> {
        try {
            const response = await firstValueFrom(this.http!.post<unknown>(
                this.requestUrl(config.endpoint),
                {
                    read: 'runtimeCombos',
                    domain,
                    authProfileId: this.cleanString(config.authProfileId) || undefined,
                    draftDomain: this.cleanString(config.draftDomain) || domain,
                },
                { withCredentials: true },
            ));
            const payload = this.extractPayload(response, domain, pageId);
            if (!payload) {
                this.combos.clearAuxiliaryCombos(COMBO_CATALOG_SCOPE);
                return false;
            }
            this.combos.setAuxiliaryCombos(COMBO_CATALOG_SCOPE, payload);
            return true;
        } catch {
            this.combos.clearAuxiliaryCombos(COMBO_CATALOG_SCOPE);
            return false;
        }
    }

    private extractPayload(response: unknown, domain: string, pageId: string): TAngoraCombosPayload | null {
        if (!response || typeof response !== 'object') return null;
        const result = response as TComboCatalogRuntimeResponse;
        if (result.ok !== true || !result.data || typeof result.data !== 'object') return null;
        const payload: TAngoraCombosPayload = {
            version: 1,
            domain,
            pageId,
            combos: result.data.combos ?? {},
        };
        return isAngoraCombosPayload(payload) ? payload : null;
    }

    private requestUrl(endpoint: string): string {
        const requestUrl = typeof this.request?.url === 'string' ? this.request.url : null;
        return buildAuthEndpointUrl(endpoint, requestUrl, { preserveRelativeOutsideTesting: true });
    }

    private cleanString(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }
}
