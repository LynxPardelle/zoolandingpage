import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { I18nService } from '@/app/shared/services/i18n.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import type { TThemeAccentColorToken } from '@/app/shared/types/theme.types';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

const resolveAccentToken = (value: unknown, fallback: TThemeAccentColorToken): TThemeAccentColorToken =>
    value === 'accentColor' || value === 'secondaryAccentColor' ? value : fallback;

export const closeModalHandler = (): EventHandler => {
    const modal = inject(GenericModalService);

    return {
        id: 'closeModal',
        handle: () => modal.close(),
    };
};

export const openFooterTermsHandler = (): EventHandler => {
    const modal = inject(GenericModalService);
    const i18n = inject(I18nService);
    const analytics = inject(AnalyticsService);
    const variables = inject(VariableStoreService);

    return {
        id: 'openFooterTerms',
        handle: () => {
            modal.open({
                id: 'terms-of-service',
                size: 'lg',
                ariaLabel: i18n.t('footer.legal.terms.title'),
                showAccentBar: true,
                accentColor: resolveAccentToken(variables.get('theme.ui.legalModalAccentColor'), 'secondaryAccentColor'),
            });

            void analytics.track(AnalyticsEvents.ActionTrigger, {
                category: AnalyticsCategories.Engagement,
                label: 'footer:terms',
                meta: { location: 'footer', action: 'open_terms_modal' },
            });
        },
    };
};

export const openFooterDataHandler = (): EventHandler => {
    const modal = inject(GenericModalService);
    const i18n = inject(I18nService);
    const analytics = inject(AnalyticsService);
    const variables = inject(VariableStoreService);

    return {
        id: 'openFooterData',
        handle: () => {
            modal.open({
                id: 'data-use',
                size: 'md',
                ariaLabel: i18n.t('footer.legal.data.title'),
                showAccentBar: true,
                accentColor: resolveAccentToken(variables.get('theme.ui.legalModalAccentColor'), 'secondaryAccentColor'),
            });

            void analytics.track(AnalyticsEvents.ActionTrigger, {
                category: AnalyticsCategories.Engagement,
                label: 'footer:data',
                meta: { location: 'footer', action: 'open_data_privacy_modal' },
            });
        },
    };
};
