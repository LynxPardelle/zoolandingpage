export type GenericTextTag =
    | ''
    | 'p'
    | 'span'
    | 'small'
    | 'strong'
    | 'em'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6';

export type TGenericTextConfig = {
    tag?: GenericTextTag;

    /** Use text for plain content. */
    text?: string | (() => string);

    /** Use html only when authored markup is required. */
    html?: string | (() => string);

    classes?: string;
    id?: string;

    ariaLabel?: string | (() => string);
};
