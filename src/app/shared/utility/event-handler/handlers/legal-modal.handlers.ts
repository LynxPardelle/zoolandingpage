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

export const openModalHandler = (): EventHandler => {
    const modal = inject(GenericModalService);
    const analytics = inject(AnalyticsService);

    return {
        id: 'openModal',
        handle: (_ctx, args) => {
            const modalId = String(args[0] ?? '').trim();
            if (!modalId) {
                return;
            }

            modal.open({ id: modalId });

            const analyticsLabel = String(args[1] ?? '').trim();
            if (!analyticsLabel) {
                return;
            }

            const analyticsAction = String(args[2] ?? '').trim();
            const analyticsLocation = String(args[3] ?? '').trim();

            void analytics.track(AnalyticsEvents.ActionTrigger, {
                category: AnalyticsCategories.Engagement,
                label: analyticsLabel,
                meta: {
                    modalId,
                    action: analyticsAction || 'open_modal',
                    ...(analyticsLocation ? { location: analyticsLocation } : {}),
                },
            });
        },
    };
};
