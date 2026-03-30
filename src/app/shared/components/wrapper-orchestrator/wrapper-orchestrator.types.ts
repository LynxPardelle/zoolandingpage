import type { TGenericStatsCounterConfig } from "@/app/shared/components/generic-stats-counter/generic-stats-counter.types";
import type { TComponentChild } from '../component-children.types';
import { TAccordionConfig } from "../generic-accordion";
import { TGenericButtonConfig } from "../generic-button/generic-button.types";
import type { TGenericCardConfig } from '../generic-card/generic-card.types';
import { TGenericContainerConfig } from "../generic-container/generic-container.types";
import type { DropdownConfig, DropdownItem } from "../generic-dropdown/generic-dropdown.types";
import type { TGenericEmbedFrameConfig } from '../generic-embed-frame/generic-embed-frame.types';
import { TGenericIconConfig } from "../generic-icon/generic-icon.types";
import type { TGenericInputConfig } from "../generic-input/generic-input.types";
import { TGenericLinkConfig } from "../generic-link/generic-link.types";
import type { TGenericMediaConfig } from "../generic-media/generic-media.types";
import type { SearchBoxConfig } from '../generic-search-box/generic-search-box.types';
import type { TabGroupConfig } from "../generic-tab-group/generic-tab-group.types";
import { TGenericTextConfig } from "../generic-text/generic-text.types";
import type { TInteractionScopeConfig } from "../interaction-scope/interaction-scope.types";

export type TGenericStatsCounterOrchestratorConfig = () => TGenericStatsCounterConfig;
export type TGenericStatsCounterConfigInput = TGenericStatsCounterConfig | (() => TGenericStatsCounterConfig);

export type TGenericDropdownOrchestratorConfig = {
    readonly items: readonly DropdownItem[];
    readonly dropdownConfig?: DropdownConfig | null;
    readonly components?: readonly TComponentChild[];
};

export type TGenericSearchBoxConfig = SearchBoxConfig;

export type TLoopBindingTransform = 'i18nKey' | 'locale' | 'navigationHref';

export type TLoopBindingSource =
    | string
    | {
        readonly from: string;
        readonly transform?: TLoopBindingTransform;
    };

export type TLoopBinding = {
    readonly to: string;
    readonly sources: readonly TLoopBindingSource[];
    readonly fallback?: unknown;
};

type TBaseLoopConfig = {
    readonly templateId: string;
    readonly idPrefix?: string;
    readonly bindings?: readonly TLoopBinding[];
};

export type TLoopConfig =
    | (TBaseLoopConfig & {
        readonly source: 'var' | 'i18n' | 'host';
        readonly path: string;
    })
    | (TBaseLoopConfig & {
        readonly source: 'repeat';
        readonly count: number;
    });

export type TGenericComponentType =
    | 'accordion'
    | 'button'
    | 'generic-card'
    | 'container'
    | 'dropdown'
    | 'embed-frame'
    | 'icon'
    | 'interaction-scope'
    | 'link'
    | 'media'
    | 'loading-spinner'
    | 'modal'
    | 'progress-bar'
    | 'search-box'
    | 'stepper'
    | 'stats-counter'
    | 'tab-group'
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
    /**
     * Optional loop materialization config.
     * Used by the orchestrator to generate component IDs/components from data sources.
     */
    readonly loopConfig?: TLoopConfig;
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
            readonly type: 'generic-card';
            readonly config: TGenericCardConfig;
        } |
        {
            readonly type: 'icon';
            readonly config: TGenericIconConfig;
        } |
        {
            readonly type: 'input';
            readonly config: TGenericInputConfig;
        } |
        {
            readonly type: 'interaction-scope';
            readonly config: TInteractionScopeConfig;
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
            readonly type: 'embed-frame';
            readonly config: TGenericEmbedFrameConfig;
        } |
        {
            readonly type: 'search-box';
            readonly config: TGenericSearchBoxConfig;
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
            readonly config: TGenericStatsCounterConfigInput;
        } |
        {
            readonly type: 'tab-group';
            readonly config: TabGroupConfig;
        } |
        {
            readonly type: 'none';
            readonly config: undefined;
        })

