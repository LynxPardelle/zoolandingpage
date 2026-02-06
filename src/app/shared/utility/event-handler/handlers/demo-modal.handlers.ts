import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const showDemoModalHandler = (): EventHandler => {
    const modal = inject(GenericModalService);
    const i18n = inject(I18nService);

    return {
        id: 'showDemoModal',
        handle: () => {
            modal.open({
                id: 'demo-modal',
                ariaLabel: i18n.t('demo.modal.title'),
                showAccentBar: true,
                accentColor: 'accentColor',
                size: 'md',
                variant: 'dialog',
            });
        },
    };
};
