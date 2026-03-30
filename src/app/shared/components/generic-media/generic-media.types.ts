
export type GenericMediaTag =
    | 'audio'
    | 'video'
    | 'image'
    | 'document'
    | 'other';

type TDynamicMediaValue<TValue> = TValue | (() => TValue);

export type TGenericMediaConfig = {
    readonly id?: TDynamicMediaValue<string>;
    readonly src: TDynamicMediaValue<string>;
    readonly tag: TDynamicMediaValue<GenericMediaTag>;
    readonly alt?: TDynamicMediaValue<string>;
    readonly classes?: TDynamicMediaValue<string>;
};

