
import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';

export type GenericMediaTag =
    | 'audio'
    | 'video'
    | 'image'
    | 'document'
    | 'other';

export type TGenericMediaConfig = {
    readonly id?: TDynamicValue<string>;
    readonly src: TDynamicValue<string>;
    readonly tag: TDynamicValue<GenericMediaTag>;
    readonly alt?: TDynamicValue<string>;
    readonly classes?: TDynamicValue<string>;
};

