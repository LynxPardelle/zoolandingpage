
import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';

export type GenericMediaTag =
    | 'audio'
    | 'video'
    | 'image'
    | 'document'
    | 'other';

export type GenericMediaImageLoading = 'eager' | 'lazy';
export type GenericMediaImageFetchPriority = 'high' | 'low' | 'auto';
export type GenericMediaImageDecoding = 'async' | 'sync' | 'auto';

export type TGenericMediaConfig = {
    readonly id?: TDynamicValue<string>;
    readonly src: TDynamicValue<string>;
    readonly tag: TDynamicValue<GenericMediaTag>;
    readonly alt?: TDynamicValue<string>;
    readonly classes?: TDynamicValue<string>;
    readonly width?: TDynamicValue<string | number>;
    readonly height?: TDynamicValue<string | number>;
    readonly loading?: TDynamicValue<GenericMediaImageLoading>;
    readonly fetchPriority?: TDynamicValue<GenericMediaImageFetchPriority>;
    readonly decoding?: TDynamicValue<GenericMediaImageDecoding>;
    readonly sizes?: TDynamicValue<string>;
};

