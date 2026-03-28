import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const showDemoModalHandler = (): EventHandler => {
    const modal = inject(GenericModalService);

    return {
        id: 'showDemoModal',
        handle: () => {
            modal.open({ id: 'demo-modal' });
        },
    };
};
