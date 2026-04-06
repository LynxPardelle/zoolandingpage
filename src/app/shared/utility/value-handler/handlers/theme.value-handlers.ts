import { ThemeService } from '@/app/shared/services/theme.service';
import { inject } from '@angular/core';
import type { ValueHandler } from '../value-handler.types';

export const themeValueHandler = (): ValueHandler => {
    const theme = inject(ThemeService);

    return {
        id: 'theme',
        resolve: () => theme.currentTheme(),
    };
};

/** Pick between (darkValue, lightValue) based on current theme. */
export const themePickValueHandler = (): ValueHandler => {
    const theme = inject(ThemeService);

    return {
        id: 'themePick',
        resolve: (_ctx, args) => {
            const cur = theme.currentTheme();
            const darkValue = args?.[0];
            const lightValue = args?.[1];
            return cur === 'dark' ? (darkValue ?? lightValue ?? '') : (lightValue ?? darkValue ?? '');
        },
    };
};
