
import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';
import type { TComponentChild } from '../component-children.types';


export type TGenericLinkConfig = {
    readonly id?: TDynamicValue<string>;
    readonly href: TDynamicValue<string>;
    readonly text?: TDynamicValue<string>;
    readonly classes?: TDynamicValue<string>;
    readonly target?: TDynamicValue<'_self' | '_blank' | '_parent' | '_top'>;
    readonly rel?: TDynamicValue<string>;
    readonly ariaLabel?: TDynamicValue<string>;
    readonly ariaExpanded?: TDynamicValue<boolean>;
    readonly ariaControls?: TDynamicValue<string>;
    readonly ariaCurrent?: TDynamicValue<boolean | 'page' | 'step' | 'location' | 'true' | 'false'>;
    readonly components?: readonly TComponentChild[];
};
