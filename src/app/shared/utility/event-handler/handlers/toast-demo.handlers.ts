import { ToastService } from '@/app/shared/components/generic-toast';
import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

export const showDemoToastHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);

    return {
        id: 'showDemoToast',
        handle: () => {
            const t = (k: string, p?: Record<string, any>) => i18n.t(k, p);
            const demos = [
                () => toast.success(t('demo.toast.success'), { source: 'Toast' }),
                () => toast.error(t('demo.toast.error'), { source: 'Toast' }),
                () => toast.warning(t('demo.toast.warning'), { source: 'Toast' }),
                () => toast.info(t('demo.toast.info'), { source: 'Toast' }),
                () =>
                    toast.show({
                        level: 'success',
                        title: t('demo.toast.fileUploadTitle'),
                        text: t('demo.toast.fileUploadText'),
                        autoCloseMs: 6000,
                        source: 'Toast',
                    }),
                () =>
                    toast.show({
                        level: 'warning',
                        title: t('demo.toast.unsavedTitle'),
                        text: t('demo.toast.unsavedText'),
                        autoCloseMs: 0,
                        source: 'Toast',
                        actions: [
                            {
                                label: t('demo.toast.unsavedSave'),
                                action: () => toast.success(t('demo.toast.changesSaved')),
                                style: 'primary',
                            },
                            {
                                label: t('demo.toast.discard'),
                                action: () => toast.info(t('demo.toast.discard')),
                                style: 'secondary',
                            },
                        ],
                    }),
            ];
            const randomDemo = demos[Math.floor(Math.random() * demos.length)];
            randomDemo();
        },
    };
};

export const showErrorToastHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);

    return {
        id: 'showErrorToast',
        handle: () => {
            const t = (k: string, p?: Record<string, any>) => i18n.t(k, p);
            toast.show({
                level: 'error',
                title: t('demo.toast.criticalTitle'),
                text: t('demo.toast.criticalText'),
                autoCloseMs: 0,
                source: 'Error',
                actions: [
                    {
                        label: t('demo.toast.contactSupport'),
                        action: () => {
                            toast.info(t('demo.toast.openingSupport'));
                        },
                        style: 'primary',
                    },
                    {
                        label: t('demo.toast.tryAgain'),
                        action: () => {
                            toast.warning(t('demo.toast.updatePostponed'));
                        },
                        style: 'secondary',
                    },
                ],
            });
        },
    };
};

export const showActionToastHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);

    return {
        id: 'showActionToast',
        handle: () => {
            const t = (k: string, p?: Record<string, any>) => i18n.t(k, p);
            toast.show({
                level: 'info',
                title: t('demo.toast.updateTitle'),
                text: t('demo.toast.updateText'),
                autoCloseMs: 10000,
                source: 'Actions',
                actions: [
                    {
                        label: t('demo.toast.updateNow'),
                        action: () => {
                            toast.success(t('demo.toast.updateStarted'));
                        },
                        style: 'primary',
                    },
                    {
                        label: t('demo.toast.viewChanges'),
                        action: () => {
                            toast.info(t('demo.toast.openingChangelog'));
                        },
                        style: 'secondary',
                    },
                    {
                        label: t('demo.toast.later'),
                        action: () => {
                            toast.warning(t('demo.toast.updatePostponed'));
                        },
                        style: 'secondary',
                    },
                ],
            });
        },
    };
};

export const showPositionDemoHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);
    let positionDemoIndex = 0;

    return {
        id: 'showPositionDemo',
        handle: () => {
            const t = (k: string, p?: Record<string, any>) => i18n.t(k, p);
            const positions = [
                {
                    vertical: 'top' as const,
                    horizontal: 'right' as const,
                    message: t('demo.toast.positionChanged', { position: 'Top Right' }),
                },
                {
                    vertical: 'top' as const,
                    horizontal: 'center' as const,
                    message: t('demo.toast.positionChanged', { position: 'Top Center' }),
                },
                {
                    vertical: 'top' as const,
                    horizontal: 'left' as const,
                    message: t('demo.toast.positionChanged', { position: 'Top Left' }),
                },
                {
                    vertical: 'bottom' as const,
                    horizontal: 'left' as const,
                    message: t('demo.toast.positionChanged', { position: 'Bottom Left' }),
                },
                {
                    vertical: 'bottom' as const,
                    horizontal: 'center' as const,
                    message: t('demo.toast.positionChanged', { position: 'Bottom Center' }),
                },
                {
                    vertical: 'bottom' as const,
                    horizontal: 'right' as const,
                    message: t('demo.toast.positionChanged', { position: 'Bottom Right (default)' }),
                },
            ];

            const currentIndex = positionDemoIndex % positions.length;
            const position = positions[currentIndex];
            toast.setPosition({ vertical: position.vertical, horizontal: position.horizontal });
            toast.success(position.message, { source: 'Position' });
            positionDemoIndex++;
        },
    };
};

export const clearAllToastsHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);

    return {
        id: 'clearAllToasts',
        handle: () => {
            const t = (k: string, p?: Record<string, any>) => i18n.t(k, p);
            toast.clear();
            setTimeout(() => {
                toast.info(t('demo.toast.allCleared'), { source: 'Clear' });
            }, 100);
        },
    };
};
