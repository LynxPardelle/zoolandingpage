import { ProcessStep } from "@/app/landing-page/components/interactive-process/interactive-process-leaf.types";
import type { TGenericStatsCounterConfig } from "@/app/shared/components/generic-stats-counter/generic-stats-counter.types";
import { TAccordionConfig } from "../generic-accordion";
import { TGenericButtonConfig } from "../generic-button/generic-button.types";
import { TGenericContainerConfig } from "../generic-container/generic-container.types";
import type { DropdownConfig, DropdownItem } from "../generic-dropdown/generic-dropdown.types";
import { GenericFeatureCardConfig } from "../generic-feature-card/generic-feature-card.types";
import { TGenericIconConfig } from "../generic-icon/generic-icon.types";
import { TGenericLinkConfig } from "../generic-link/generic-link.types";
import type { TGenericMediaConfig } from "../generic-media/generic-media.types";
import type { TestimonialCardConfig } from "../generic-testimonial-card/generic-testimonial-card.types";
import { TGenericTextConfig } from "../generic-text/generic-text.types";

export type TInteractiveProcessConfig = {
    readonly process: () => readonly ProcessStep[];
    readonly currentStep: () => number;
};

export type TGenericStatsCounterOrchestratorConfig = () => TGenericStatsCounterConfig;

export type TGenericDropdownOrchestratorConfig = {
    readonly items: readonly DropdownItem[];
    readonly dropdownConfig?: DropdownConfig | null;
    readonly components?: readonly string[];
};

export type TGenericComponentType =
    | 'accordion'
    | 'button'
    | 'container'
    | 'dropdown'
    | 'feature-card'
    | 'icon'
    | 'interactive-process'
    | 'link'
    | 'media'
    | 'loading-spinner'
    | 'modal'
    | 'progress-bar'
    | 'search-box'
    | 'stepper'
    | 'stats-counter'
    | 'tab-group'
    | 'testimonial-card'
    | 'text'
    | 'toast'
    | 'tooltip'
    | 'input'
    | 'none';

export type TGenericComponent = {
    readonly id: string;
    /**
     * Condition for rendering the component. Can be:
     * - boolean: static show/hide
     * - function: () => boolean
     * - string: DSL for ConditionOrchestrator (e.g. all:env,features.debugMode)
     */
    readonly condition?: boolean | string | (() => boolean);
    readonly eventInstructions?: string;
    /**
     * String DSL for resolving dynamic config values (labels/text/etc) via ValueOrchestrator.
     * Example: set:config.label,i18n,hero.primary.label
     */
    readonly valueInstructions?: string;
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
            readonly type: 'dropdown';
            readonly config: TGenericDropdownOrchestratorConfig;
        } |
        {
            readonly type: 'feature-card';
            readonly config: GenericFeatureCardConfig;
        } |
        {
            readonly type: 'interactive-process';
            readonly config: TInteractiveProcessConfig;
        } |
        {
            readonly type: 'text';
            readonly config: TGenericTextConfig;
        } |
        {
            readonly type: 'link';
            readonly config: TGenericLinkConfig;
        } |
        {
            readonly type: 'media';
            readonly config: TGenericMediaConfig;
        } |
        {
            readonly type: 'stats-counter';
            readonly config: TGenericStatsCounterOrchestratorConfig;
        } |
        {
            readonly type: 'testimonial-card';
            readonly config: TestimonialCardConfig;
        } |
        {
            readonly type: 'none';
            readonly config: undefined;
        })

