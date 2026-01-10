import { I18nService } from '@/app/core/services/i18n.service';
import { LanguageService } from '@/app/core/services/language.service';
import { getTranslations } from '@/app/landing-page/components/landing-page/i18n.constants';
import type { LandingPageTranslations } from '@/app/landing-page/components/landing-page/i18n.types';
import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { WHATSAPP_PHONE } from '@/app/shared/services/contact.constants';
import { buildWhatsAppUrl } from '@/app/shared/utility/buildWhatsAppUrl.utility';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

const landingTranslations = (globalI18n: I18nService, language: LanguageService): LandingPageTranslations => {
    const fromCore = globalI18n.get<LandingPageTranslations>('landing');
    if (fromCore) return fromCore;
    return getTranslations(language.currentLanguage() as any);
};

const safeOpen = (url: string): void => {
    try {
        if (!url) return;
        if (typeof window === 'undefined') return;
        window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
        // no-op
    }
};

export const openWhatsAppHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);
    const globalI18n = inject(I18nService);
    const language = inject(LanguageService);

    return {
        id: 'openWhatsApp',
        handle: (_ctx, args) => {
            const metaTitle = String(args[0] ?? '');
            const location = String(args[1] ?? '');
            const serviceLabel = args[2] == null ? undefined : String(args[2]);

            const t = landingTranslations(globalI18n, language);
            const rawMessage = t.ui?.contact?.whatsappMessage;

            const link = buildWhatsAppUrl(WHATSAPP_PHONE, rawMessage);

            const isService = metaTitle === AnalyticsEvents.ServicesCtaClick;
            const comingFromServicesSection = location === 'services';

            if (isService) {
                if (!comingFromServicesSection || !!serviceLabel) {
                    const label = serviceLabel || 'whatsapp-button';
                    void analytics.track(metaTitle, {
                        category: AnalyticsCategories.CTA,
                        label,
                        meta: { location, via: 'whatsapp_button' },
                    });
                }
            } else {
                void analytics.track(metaTitle, {
                    category: AnalyticsCategories.CTA,
                    label: 'whatsapp-button',
                    meta: { location, forwardedFrom: serviceLabel || null },
                });
            }

            safeOpen(link);
        },
    };
};

export const openFaqCtaWhatsAppHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);
    const globalI18n = inject(I18nService);
    const language = inject(LanguageService);

    return {
        id: 'openFaqCtaWhatsApp',
        handle: () => {
            void analytics.track(AnalyticsEvents.FaqCtaClick, {
                category: AnalyticsCategories.CTA,
                label: 'faq:whatsapp',
                meta: { location: 'faq-section', channel: 'whatsapp' },
            });

            const t = landingTranslations(globalI18n, language);
            const message = t.ui?.sections?.faq?.subtitle;
            const link = buildWhatsAppUrl(WHATSAPP_PHONE, message);
            safeOpen(link);
        },
    };
};

export const openFinalCtaWhatsAppHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);
    const globalI18n = inject(I18nService);
    const language = inject(LanguageService);

    return {
        id: 'openFinalCtaWhatsApp',
        handle: (_ctx, args) => {
            const eventName = args[0] == null ? undefined : String(args[0]);
            const variantRaw = args[1] == null ? 'primary' : String(args[1]);
            const variant = (variantRaw || 'primary') as string;

            const name = String(eventName ?? AnalyticsEvents.CtaClick);

            void analytics.track(name, {
                category: AnalyticsCategories.CTA,
                label: `final-cta:${ variant }`,
                meta: {
                    location: 'final-cta',
                    source: 'final_cta_section',
                    channel: 'whatsapp',
                    phone: WHATSAPP_PHONE,
                },
            });

            const t = landingTranslations(globalI18n, language);
            const message = t.hero?.subtitle;
            const link = buildWhatsAppUrl(WHATSAPP_PHONE, message);
            safeOpen(link);
        },
    };
};
