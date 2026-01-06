import { TAccordionConfig } from "../generic-accordion";
import { TGenericButtonConfig } from "../generic-button/generic-button.types";
import { TGenericContainerConfig } from "../generic-container/generic-container.types";
import { TGenericIconConfig } from "../generic-icon/generic-icon.types";
import { TGenericTextConfig } from "../generic-text/generic-text.types";

export type TGenericComponentType =
    | 'accordion'
    | 'button'
    | 'container'
    | 'dropdown'
    | 'feature-card'
    | 'icon'
    | 'loading-spinner'
    | 'modal'
    | 'progress-bar'
    | 'search-box'
    | 'stepper'
    | 'tab-group'
    | 'testimonial-card'
    | 'text'
    | 'toast'
    | 'tooltip'
    | 'input'
    | 'none';

export type TGenericComponent = {
    readonly id: string;
    readonly condition?: boolean | string;
    readonly eventInstructions?: string;
    readonly order?: number;
    readonly meta_title?: string;
} & (
        {
            readonly type: 'accordion';
            readonly config: TAccordionConfig;
        } |
        {
            readonly type: 'button';
            readonly config: TGenericButtonConfig;
        } |
        {
            readonly type: 'icon';
            readonly config: TGenericIconConfig;
        } |
        {
            readonly type: 'container';
            readonly config: TGenericContainerConfig;
        } |
        {
            readonly type: 'text';
            readonly config: TGenericTextConfig;
        } |
        {
            readonly type: 'none';
            readonly config: undefined;
        })

