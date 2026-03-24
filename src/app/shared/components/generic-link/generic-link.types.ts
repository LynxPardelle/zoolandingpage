
import type { TComponentChild } from '../component-children.types';


export type TGenericLinkConfig = {
    readonly id: string;
    readonly href: string | (() => string);
    readonly text?: string | (() => string);
    readonly classes?: string;
    readonly target?: '_self' | '_blank' | '_parent' | '_top';
    readonly rel?: string;
    readonly ariaLabel?: string | (() => string);
    readonly ariaExpanded?: boolean;
    readonly ariaControls?: string;
    readonly ariaCurrent?: boolean | 'page' | 'step' | 'location' | 'true' | 'false';
    readonly components?: readonly TComponentChild[];
};
