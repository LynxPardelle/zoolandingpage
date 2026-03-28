import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const closeModalHandler = (): EventHandler => {
    const modal = inject(GenericModalService);

    return {
        id: 'closeModal',
        handle: () => modal.close(),
    };
};

export const openFooterTermsHandler = (): EventHandler => {
    const modal = inject(GenericModalService);
    const analytics = inject(AnalyticsService);

    return {
        id: 'openFooterTerms',
        handle: () => {
            modal.open({ id: 'terms-of-service' });

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
    const analytics = inject(AnalyticsService);

    return {
        id: 'openFooterData',
        handle: () => {
            modal.open({ id: 'data-use' });

            void analytics.track(AnalyticsEvents.ActionTrigger, {
                category: AnalyticsCategories.Engagement,
                label: 'footer:data',
                meta: { location: 'footer', action: 'open_data_privacy_modal' },
            });
        },
    };
};
