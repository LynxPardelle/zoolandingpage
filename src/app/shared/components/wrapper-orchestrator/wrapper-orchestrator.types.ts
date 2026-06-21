import type { TGenericStatsCounterConfig } from "@/app/shared/components/generic-stats-counter/generic-stats-counter.types";
import type { TComponentChild } from '../component-children.types';
import { TAccordionConfig } from "../generic-accordion";
import { TGenericButtonConfig } from "../generic-button/generic-button.types";
import type { TGenericCardConfig } from '../generic-card/generic-card.types';
import { TGenericContainerConfig } from "../generic-container/generic-container.types";
import type { DropdownConfig, DropdownItem } from "../generic-dropdown/generic-dropdown.types";
import type { TGenericEmbedFrameConfig } from '../generic-embed-frame/generic-embed-frame.types';
import { TGenericIconConfig } from "../generic-icon/generic-icon.types";
import type { TGenericCellConfig } from "../generic-cell/generic-cell.types";
import type { TGenericFileDropzoneConfig } from "../generic-file-dropzone/generic-file-dropzone.types";
import type { TGenericInputConfig } from "../generic-input/generic-input.types";
import { TGenericLinkConfig } from "../generic-link/generic-link.types";
import type { LoadingSpinnerSize, LoadingSpinnerVariant } from "../generic-loading-spinner/generic-loading-spinner.types";
import type { TGenericMediaConfig } from "../generic-media/generic-media.types";
import type { TGenericPaginationConfig } from "../generic-pagination/generic-pagination.types";
import type { TGenericQrCodeConfig } from "../generic-qr-code/generic-qr-code.types";
import type { TGenericRichTextConfig } from "../generic-rich-text/generic-rich-text.types";
import type { SearchBoxConfig } from '../generic-search-box/generic-search-box.types';
import type { TabGroupConfig } from "../generic-tab-group/generic-tab-group.types";
import type { TGenericTableConfig } from "../generic-table/generic-table.types";
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

export type TLoopBindingTransform = 'i18nKey' | 'locale' | 'navigationHref' | 'uriComponent';

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
    readonly prefix?: string;
    readonly suffix?: string;
};

export type TLoopViewValueSource =
    | {
        readonly source: 'literal';
        readonly value?: unknown;
        readonly fallback?: unknown;
    }
    | {
        readonly source: 'queryParam';
        readonly key: string;
        readonly fallback?: unknown;
    }
    | {
        readonly source: 'scope' | 'var' | 'host';
        readonly path: string;
        readonly fallback?: unknown;
    };

export type TLoopViewFilterOperator =
    | 'equals'
    | 'notEquals'
    | 'contains'
    | 'includes'
    | 'exists'
    | 'notExists';

export type TLoopViewActivation = {
    readonly source: TLoopViewValueSource;
    readonly equals?: unknown;
    readonly notEquals?: unknown;
};

export type TLoopViewFilter = {
    readonly path: string;
    readonly op?: TLoopViewFilterOperator;
    readonly value?: unknown | TLoopViewValueSource;
    readonly ignoreValues?: readonly unknown[];
    readonly activeWhen?: TLoopViewActivation;
};

export type TLoopViewSortOption = {
    readonly path: string;
    readonly direction?: 'asc' | 'desc';
    readonly type?: 'text' | 'number';
};

export type TLoopViewSort = TLoopViewSortOption & {
    readonly by?: TLoopViewValueSource;
    readonly options?: Record<string, TLoopViewSortOption>;
};

export type TLoopViewPagination = {
    readonly page?: number | TLoopViewValueSource;
    readonly pageSize?: number | TLoopViewValueSource;
    readonly pageIndexBase?: 0 | 1;
    readonly applyWhenAnyQueryParam?: readonly string[];
};

export type TLoopCollectionView = {
    readonly filters?: readonly TLoopViewFilter[];
    readonly sort?: TLoopViewSort;
    readonly pagination?: TLoopViewPagination;
};

type TBaseLoopConfig = {
    readonly templateId: string;
    readonly idPrefix?: string;
    readonly bindings?: readonly TLoopBinding[];
    readonly view?: TLoopCollectionView;
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
    | 'generic-cell'
    | 'generic-file-dropzone'
    | 'generic-rich-text'
    | 'generic-table'
    | 'icon'
    | 'interaction-scope'
    | 'link'
    | 'media'
    | 'pagination'
    | 'qr-code'
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
        * - string: DSL for ConditionOrchestrator (e.g. all:varEq,theme.defaultMode,dark)
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
            readonly type: 'generic-cell';
            readonly config: TGenericCellConfig;
        } |
        {
            readonly type: 'generic-file-dropzone';
            readonly config: TGenericFileDropzoneConfig;
        } |
        {
            readonly type: 'generic-rich-text';
            readonly config: TGenericRichTextConfig;
        } |
        {
            readonly type: 'generic-table';
            readonly config: TGenericTableConfig;
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
            readonly type: 'pagination';
            readonly config: TGenericPaginationConfig;
        } |
        {
            readonly type: 'qr-code';
            readonly config: TGenericQrCodeConfig;
        } |
        {
            readonly type: 'loading-spinner';
            readonly config: {
                readonly variant?: LoadingSpinnerVariant;
                readonly size?: LoadingSpinnerSize;
                readonly classes?: string;
            };
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

