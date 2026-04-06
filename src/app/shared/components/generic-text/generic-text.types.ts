import type { TDynamicStringValue, TDynamicValue } from '@/app/shared/types/component-runtime.types';

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
    tag?: TDynamicValue<GenericTextTag>;

    /** Use text for plain content. */
    text?: TDynamicStringValue;

    /** Use html only when authored markup is required. */
    html?: TDynamicStringValue;

    classes?: TDynamicStringValue;
    id?: TDynamicStringValue;

    ariaLabel?: TDynamicStringValue;
};
