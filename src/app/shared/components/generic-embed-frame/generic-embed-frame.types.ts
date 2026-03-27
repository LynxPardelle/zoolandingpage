type TDynamicString = string | (() => string);
type TDynamicBoolean = boolean | (() => boolean);
type TDynamicNumber = number | string | (() => number | string);

export type TGenericEmbedFrameConfig = {
    readonly id?: TDynamicString;
    readonly src: TDynamicString;
    readonly title: TDynamicString;
    readonly classes?: TDynamicString;
    readonly height?: TDynamicNumber;
    readonly loading?: 'eager' | 'lazy';
    readonly allow?: TDynamicString;
    readonly referrerPolicy?: TDynamicString;
    readonly sandbox?: TDynamicString;
    readonly allowFullscreen?: TDynamicBoolean;
};
