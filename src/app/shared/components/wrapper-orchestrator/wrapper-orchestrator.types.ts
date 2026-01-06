import { ProcessStep } from "@/app/landing-page/components/interactive-process/interactive-process.types";
import type { StatsCounterConfig } from "@/app/landing-page/components/stats-counter/stats-counter.types";
import { TAccordionConfig } from "../generic-accordion";
import { TGenericButtonConfig } from "../generic-button/generic-button.types";
import { TGenericContainerConfig } from "../generic-container/generic-container.types";
import { GenericFeatureCardConfig } from "../generic-feature-card/generic-feature-card.types";
import { TGenericIconConfig } from "../generic-icon/generic-icon.types";
import type { TestimonialCardConfig } from "../generic-testimonial-card/generic-testimonial-card.types";
import { TGenericTextConfig } from "../generic-text/generic-text.types";

export type TInteractiveProcessConfig = {
    readonly process: () => readonly ProcessStep[];
    readonly currentStep: () => number;
};

export type TStatsCounterOrchestratorConfig = () => StatsCounterConfig;

export type TGenericComponentType =
    | 'accordion'
    | 'button'
    | 'container'
    | 'dropdown'
    | 'feature-card'
    | 'icon'
    | 'interactive-process'
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
            readonly type: 'stats-counter';
            readonly config: TStatsCounterOrchestratorConfig;
        } |
        {
            readonly type: 'testimonial-card';
            readonly config: TestimonialCardConfig;
        } |
        {
            readonly type: 'none';
            readonly config: undefined;
        })

