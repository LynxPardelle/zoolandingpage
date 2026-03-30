import type {
    TDynamicBooleanValue,
    TDynamicStringLikeValue,
    TDynamicStringValue,
} from '@/app/shared/types/component-runtime.types';

export type TGenericEmbedFrameConfig = {
    readonly id?: TDynamicStringValue;
    readonly src: TDynamicStringValue;
    readonly title: TDynamicStringValue;
    readonly classes?: TDynamicStringValue;
    readonly height?: TDynamicStringLikeValue;
    readonly loading?: 'eager' | 'lazy';
    readonly allow?: TDynamicStringValue;
    readonly referrerPolicy?: TDynamicStringValue;
    readonly sandbox?: TDynamicStringValue;
    readonly allowFullscreen?: TDynamicBooleanValue;
};
