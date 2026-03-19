import { GenericModalService } from '@/app/shared/components/generic-modal/generic-modal.service';
import { I18nService } from '@/app/shared/services/i18n.service';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';
import type { TThemeAccentColorToken } from '@/app/shared/types/theme.types';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

const resolveAccentToken = (value: unknown, fallback: TThemeAccentColorToken): TThemeAccentColorToken =>
    value === 'accentColor' || value === 'secondaryAccentColor' ? value : fallback;

export const showDemoModalHandler = (): EventHandler => {
    const modal = inject(GenericModalService);
    const i18n = inject(I18nService);
    const variables = inject(VariableStoreService);

    return {
        id: 'showDemoModal',
        handle: () => {
            modal.open({
                id: 'demo-modal',
                ariaLabel: i18n.t('demo.modal.title'),
                showAccentBar: true,
                accentColor: resolveAccentToken(variables.get('theme.ui.demoModalAccentColor'), 'accentColor'),
                size: 'md',
                variant: 'dialog',
            });
        },
    };
};
