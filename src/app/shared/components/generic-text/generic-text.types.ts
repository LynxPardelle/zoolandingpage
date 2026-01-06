import { TemplateRef } from '@angular/core';

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

    /** Usa text si quieres texto plano (recomendado). */
    text?: string;

    /** Usa html si necesitas markup; se sanitiza antes de renderizar. */
    html?: string;

    components?: readonly string[];

    /** Registro id -> plantilla (definida en el padre con <ng-template #...>) */
    componentTemplates?: Readonly<Record<string, TemplateRef<unknown>>>;

    classes?: string;
    id?: string;

    ariaLabel?: string;
};
