import type { TemplateRef } from '@angular/core';

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
    | 'li'
    | 'aside';

export type TGenericContainerConfig = {
    tag?: GenericContainerComponentTag;

    id?: string;
    classes?: string;

    role?: string;
    ariaLabel?: string;
    ariaLabelledby?: string;
    ariaDescribedby?: string;

    /** orden de renderizado de slots (incluye '__content__') */
    components?: readonly string[];

    /** templates por id */
    componentTemplates?: Readonly<Record<string, TemplateRef<unknown>>>;

    /** opcional */
    styles?: Readonly<Record<string, string | null | undefined>>;
    classMap?: Readonly<Record<string, boolean>>;
};
