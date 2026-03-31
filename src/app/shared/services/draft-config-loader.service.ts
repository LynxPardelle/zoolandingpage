import { getLocaleCandidates } from '@/app/shared/i18n/locale.utils';
import type {
    TAngoraCombosPayload,
    TComponentsPayload,
    TDraftSiteConfigPayload,
    TI18nPayload,
    TPageConfigPayload,
    TVariablesPayload,
} from '@/app/shared/types/config-payloads.types';
import {
    isAngoraCombosPayload,
    isDraftSiteConfigPayload,
    isI18nPayload,
    isPageConfigPayload,
    isVariablesPayload
} from '@/app/shared/utility/config-validation/config-payload.validators';
import { environment } from '@/environments/environment';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DraftConfigLoaderService {
    private readonly debugWorkspaceBase = `${ String(environment.drafts.basePath ?? 'assets/drafts').replace(/\/$/, '') }/_debug/debug-workspace`;

    private getDomainBase(domain?: string): string {
        const base = String(environment.drafts.basePath ?? 'assets/drafts').replace(/\/$/, '');
        const d = String(domain ?? '').trim();
        if (!d) {
            return '';
        }

        return `${ base }/${ encodeURIComponent(d) }`;
    }

    private getDraftBase(domain?: string, pageId?: string): string {
        const base = this.getDomainBase(domain);
        const p = String(pageId ?? '').trim();
        if (!base || !p) {
            return '';
        }

        return `${ base }/${ encodeURIComponent(p) }`;
    }

    private async getJson<T>(path: string): Promise<T | null> {
        try {
            const response = await fetch(path, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                return null;
            }

            const raw = await response.text();
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    async loadSiteConfig(domain?: string): Promise<TDraftSiteConfigPayload | null> {
        const domainBase = this.getDomainBase(domain);
        if (!domainBase) {
            return null;
        }

        const url = `${ domainBase }/site-config.json`;
        const payload = await this.getJson<TDraftSiteConfigPayload>(url);
        return isDraftSiteConfigPayload(payload) ? payload : null;
    }

    async loadPageConfig(domain?: string, pageId?: string): Promise<TPageConfigPayload | null> {
        const draftBase = this.getDraftBase(domain, pageId);
        if (!draftBase) {
            return null;
        }

        const url = `${ draftBase }/page-config.json`;
        const payload = await this.getJson<TPageConfigPayload>(url);
        return isPageConfigPayload(payload) ? payload : null;
    }

    async loadComponents(domain?: string, pageId?: string): Promise<TComponentsPayload | null> {
        const draftBase = this.getDraftBase(domain, pageId);
        if (!draftBase) {
            return null;
        }

        const url = `${ draftBase }/components.json`;
        const payload = await this.getJson<TComponentsPayload>(url);
        return payload && typeof payload === 'object' ? (payload as TComponentsPayload) : null;
    }

    async loadVariables(domain?: string, pageId?: string): Promise<TVariablesPayload | null> {
        const draftBase = this.getDraftBase(domain, pageId);
        if (!draftBase) {
            return null;
        }

        const url = `${ draftBase }/variables.json`;
        const payload = await this.getJson<TVariablesPayload>(url);
        return isVariablesPayload(payload) ? payload : null;
    }

    async loadAngoraCombos(domain?: string, pageId?: string): Promise<TAngoraCombosPayload | null> {
        const draftBase = this.getDraftBase(domain, pageId);
        if (!draftBase) {
            return null;
        }

        const url = `${ draftBase }/angora-combos.json`;
        const payload = await this.getJson<TAngoraCombosPayload>(url);
        return isAngoraCombosPayload(payload) ? payload : null;
    }

    async loadDebugWorkspacePageConfig(): Promise<TPageConfigPayload | null> {
        const payload = await this.getJson<TPageConfigPayload>(`${ this.debugWorkspaceBase }/page-config.json`);
        return isPageConfigPayload(payload) ? payload : null;
    }

    async loadDebugWorkspaceComponents(): Promise<TComponentsPayload | null> {
        const payload = await this.getJson<TComponentsPayload>(`${ this.debugWorkspaceBase }/components.json`);
        return payload && typeof payload === 'object' ? (payload as TComponentsPayload) : null;
    }

    async loadDebugWorkspaceCombos(): Promise<TAngoraCombosPayload | null> {
        const payload = await this.getJson<TAngoraCombosPayload>(`${ this.debugWorkspaceBase }/angora-combos.json`);
        return isAngoraCombosPayload(payload) ? payload : null;
    }

    async loadI18n(domain: string, pageId: string, lang: string): Promise<TI18nPayload | null> {
        const base = this.getDraftBase(domain, pageId);
        if (!base) {
            return null;
        }

        const candidates = getLocaleCandidates(lang);

        for (const candidate of candidates) {
            const url = `${ base }/i18n/${ encodeURIComponent(candidate) }.json`;
            const payload = await this.getJson<TI18nPayload>(url);
            if (isI18nPayload(payload)) {
                return payload;
            }
        }

        return null;
    }
}
