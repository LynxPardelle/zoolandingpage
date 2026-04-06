import { ToastService } from '@/app/shared/components/generic-toast';
import { I18nService } from '@/app/shared/services/i18n.service';
import { inject } from '@angular/core';
import type { EventHandler } from '../event-handler.types';

type TToastTranslator = (key: string, params?: Record<string, unknown>) => string;

type TToastPositionDemo = {
    readonly vertical: 'top' | 'bottom';
    readonly horizontal: 'left' | 'center' | 'right';
    readonly labelKey: string;
};

const TOAST_POSITION_DEMOS: readonly TToastPositionDemo[] = [
    { vertical: 'top', horizontal: 'right', labelKey: 'demo.toast.positionTopRight' },
    { vertical: 'top', horizontal: 'center', labelKey: 'demo.toast.positionTopCenter' },
    { vertical: 'top', horizontal: 'left', labelKey: 'demo.toast.positionTopLeft' },
    { vertical: 'bottom', horizontal: 'left', labelKey: 'demo.toast.positionBottomLeft' },
    { vertical: 'bottom', horizontal: 'center', labelKey: 'demo.toast.positionBottomCenter' },
    { vertical: 'bottom', horizontal: 'right', labelKey: 'demo.toast.positionBottomRightDefault' },
];

const createTranslator = (i18n: I18nService): TToastTranslator =>
    (key: string, params?: Record<string, unknown>) => i18n.t(key, params);

export const showDemoToastHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);
    const t = createTranslator(i18n);

    return {
        id: 'showDemoToast',
        handle: () => {
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
    const t = createTranslator(i18n);

    return {
        id: 'showErrorToast',
        handle: () => {
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
    const t = createTranslator(i18n);

    return {
        id: 'showActionToast',
        handle: () => {
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
    const t = createTranslator(i18n);
    let positionDemoIndex = 0;

    return {
        id: 'showPositionDemo',
        handle: () => {
            const currentIndex = positionDemoIndex % TOAST_POSITION_DEMOS.length;
            const position = TOAST_POSITION_DEMOS[currentIndex];
            toast.setPosition({ vertical: position.vertical, horizontal: position.horizontal });
            toast.success(t('demo.toast.positionChanged', { position: t(position.labelKey) }), { source: 'Position' });
            positionDemoIndex++;
        },
    };
};

export const clearAllToastsHandler = (): EventHandler => {
    const toast = inject(ToastService);
    const i18n = inject(I18nService);
    const t = createTranslator(i18n);

    return {
        id: 'clearAllToasts',
        handle: () => {
            toast.clear();
            setTimeout(() => {
                toast.info(t('demo.toast.allCleared'), { source: 'Clear' });
            }, 100);
        },
    };
};
