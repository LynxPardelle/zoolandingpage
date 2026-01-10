import { AnalyticsCategories, AnalyticsEvents } from '@/app/shared/services/analytics.events';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { InteractiveProcessStoreService } from '@/app/shared/services/interactive-process-store.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const setInteractiveProcessStepHandler = (): EventHandler => {
    const store = inject(InteractiveProcessStoreService);
    const analytics = inject(AnalyticsService);

    return {
        id: 'setInteractiveProcessStep',
        handle: (_ctx, args) => {
            const step = Number(args[0]);
            if (!Number.isFinite(step)) return;

            store.setStep(step);

            void analytics.track(AnalyticsEvents.ProcessStepChange, {
                category: AnalyticsCategories.Process,
                label: String(step + 1),
            });
        },
    };
};
