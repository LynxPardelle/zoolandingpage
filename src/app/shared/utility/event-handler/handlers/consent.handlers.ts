import { ToastService } from '@/app/shared/components/generic-toast';
import { AnalyticsService } from '@/app/shared/services/analytics.service';
import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const acceptConsentHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'acceptConsent',
        handle: () => analytics.acceptConsent(),
    };
};

export const declineConsentHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'declineConsent',
        handle: () => analytics.declineConsent(),
    };
};

export const remindLaterHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);

    return {
        id: 'remindLater',
        handle: (_ctx, args) => {
            const hours = Number(args[0]);
            analytics.remindLater(Number.isFinite(hours) ? hours : 0);
        },
    };
};

export const removeConsentRequestHandler = (): EventHandler => {
    const analytics = inject(AnalyticsService);
    const toast = inject(ToastService);
    const i18n = inject(I18nService);

    return {
        id: 'removeConsentRequest',
        handle: () => {
            toast.show({
                level: 'warning',
                title: i18n.t('consent.title'),
                text: i18n.t('consent.feedback.confirmRemove'),
                autoCloseMs: 7000,
                actions: [
                    {
                        label: i18n.t('consent.actions.confirm'),
                        style: 'primary',
                        action: () => analytics.declineConsent(),
                    },
                    {
                        label: i18n.t('consent.actions.cancel'),
                        style: 'secondary',
                        action: () => {
                            /* no-op */
                        },
                    },
                ],
            });
        },
    };
};
