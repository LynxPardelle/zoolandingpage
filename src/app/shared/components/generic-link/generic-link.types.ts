
import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';
import type { TDraftNavigationScrollRestorationConfig } from '@/app/shared/types/config-payloads.types';
import type { TComponentChild } from '../component-children.types';


export type TGenericLinkConfig = {
    readonly id?: TDynamicValue<string>;
    readonly href: TDynamicValue<string>;
    readonly text?: TDynamicValue<string>;
    readonly classes?: TDynamicValue<string>;
    readonly styles?: TDynamicValue<Readonly<Record<string, string | number | null | undefined>>>;
    readonly target?: TDynamicValue<'_self' | '_blank' | '_parent' | '_top'>;
    readonly rel?: TDynamicValue<string>;
    readonly ariaLabel?: TDynamicValue<string>;
    readonly ariaExpanded?: TDynamicValue<boolean>;
    readonly ariaControls?: TDynamicValue<string>;
    readonly ariaCurrent?: TDynamicValue<boolean | 'page' | 'step' | 'location' | 'true' | 'false'>;
    readonly scrollRestoration?: TDraftNavigationScrollRestorationConfig;
    readonly components?: readonly TComponentChild[];
};
