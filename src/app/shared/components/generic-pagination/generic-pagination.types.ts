import type { TDynamicStringValue } from '@/app/shared/types/component-runtime.types';
import type { TLoopCollectionView } from '../wrapper-orchestrator/wrapper-orchestrator.types';

export type TGenericPaginationConfig = {
    readonly id?: string;
    readonly ariaLabel?: TDynamicStringValue;
    readonly classes?: TDynamicStringValue;
    readonly listClasses?: TDynamicStringValue;
    readonly linkClasses?: TDynamicStringValue;
    readonly activeLinkClasses?: TDynamicStringValue;
    readonly disabledLinkClasses?: TDynamicStringValue;
    readonly ellipsisClasses?: TDynamicStringValue;
    readonly summaryClasses?: TDynamicStringValue;
    readonly previousLabel?: TDynamicStringValue;
    readonly nextLabel?: TDynamicStringValue;
    readonly collectionPath: string;
    readonly totalItemsPath?: string;
    readonly totalItemsPathWhenNoQueryParams?: readonly string[];
    readonly view?: TLoopCollectionView;
    readonly pageParam?: string;
    readonly pageSizeParam?: string;
    readonly defaultPage?: number;
    readonly defaultPageSize?: number;
    readonly pageIndexBase?: 0 | 1;
    readonly maxNumericLinks?: number;
    readonly path?: string;
    readonly fragment?: string;
    readonly showBoundaryLinks?: boolean;
    readonly hideWhenEmpty?: boolean;
    readonly hideWhenSinglePage?: boolean;
    readonly summaryTemplate?: TDynamicStringValue;
};

export type TGenericPaginationPageItem =
    | {
        readonly kind: 'page';
        readonly page: number;
        readonly label: string;
        readonly href: string;
        readonly active: boolean;
    }
    | {
        readonly kind: 'ellipsis';
        readonly label: string;
    };
