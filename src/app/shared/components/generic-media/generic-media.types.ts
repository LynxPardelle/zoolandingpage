

export type GenericMediaTag =
    | 'audio'
    | 'video'
    | 'image'
    | 'document'
    | 'other';

export type TGenericMediaConfig = {
    readonly id: string;
    readonly src: string;
    readonly tag: GenericMediaTag;
    readonly alt?: string;
    readonly classes?: string;
    readonly components?: readonly string[];
};

