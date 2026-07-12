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
    /** @deprecated Iframe security policy is immutable at render time. */
    readonly allow?: TDynamicStringValue;
    /** @deprecated Iframe security policy is immutable at render time. */
    readonly referrerPolicy?: TDynamicStringValue;
    /** @deprecated Iframe security policy is immutable at render time. */
    readonly sandbox?: TDynamicStringValue;
    /** @deprecated Iframe security policy is immutable at render time. */
    readonly allowFullscreen?: TDynamicBooleanValue;
};
