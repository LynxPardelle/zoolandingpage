import type { TAnalyticsConfigPayload, TSeoPayload } from '@/app/shared/types/config-payloads.types';
import { inject, Injectable } from '@angular/core';
import { DraftConfigLoaderService } from './draft-config-loader.service';
import { I18nService } from './i18n.service';
import { StructuredDataService } from './structured-data.service';

export type TDraftBootstrapResult = {
    readonly seo?: TSeoPayload | null;
    readonly analytics?: TAnalyticsConfigPayload | null;
    readonly structuredDataApplied: boolean;
};

@Injectable({ providedIn: 'root' })
export class DraftBootstrapService {
    private readonly drafts = inject(DraftConfigLoaderService);
    private readonly i18n = inject(I18nService);
    private readonly structured = inject(StructuredDataService);

    async applyDrafts(domain: string, pageId: string, lang: string): Promise<TDraftBootstrapResult> {
        const seo = await this.drafts.loadSeo(domain, pageId);
        const analytics = await this.drafts.loadAnalyticsConfig(domain, pageId);
        const structuredData = await this.drafts.loadStructuredData(domain, pageId);

        let structuredDataApplied = false;
        if (structuredData?.entries?.length) {
            structuredData.entries.forEach((entry, index) => {
                this.structured.injectOnce(`sd:draft:${ index }`, entry);
            });
            structuredDataApplied = true;
        }

        const primary = await this.drafts.loadI18n(domain, pageId, lang);
        if (primary?.dictionary) {
            this.i18n.setTranslations(primary.lang, primary.dictionary, { cache: true, applyIfCurrent: true });
        }

        const fallbackLang = lang === 'es' ? 'en' : 'es';
        const secondary = await this.drafts.loadI18n(domain, pageId, fallbackLang);
        if (secondary?.dictionary) {
            this.i18n.setTranslations(secondary.lang, secondary.dictionary, { cache: true, applyIfCurrent: false });
        }

        return { seo, analytics, structuredDataApplied };
    }
}
