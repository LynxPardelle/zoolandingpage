import type { TDynamicStringValue, TDynamicValue } from '@/app/shared/types/component-runtime.types';
import type { TemplateRef } from '@angular/core';
import type { TComponentChild } from '../component-children.types';

export type GenericContainerComponentTag =
    | 'span'
    | 'div'
    | 'section'
    | 'main'
    | 'header'
    | 'footer'
    | 'nav'
    | 'article'
    | 'ul'
    | 'ol'
    | 'li'
    | 'aside';

export type TGenericContainerConfig = {
    tag?: TDynamicValue<GenericContainerComponentTag>;

    id?: TDynamicStringValue;
    classes?: TDynamicStringValue;
    tabindex?: number;
    role?: TDynamicStringValue;
    ariaLabel?: TDynamicStringValue;
    ariaLabelledby?: TDynamicStringValue;
    ariaDescribedby?: TDynamicStringValue;

    /** Render order for slots, including '__content__'. */
    components?: readonly TComponentChild[];

    /** Templates keyed by component id. */
    componentTemplates?: Readonly<Record<string, TemplateRef<unknown>>>;

    /** Optional inline styles and class map. */
    styles?: Readonly<Record<string, string | null | undefined>>;
    classMap?: Readonly<Record<string, boolean>>;
};
