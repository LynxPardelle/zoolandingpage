import { TBuildDebugWorkspaceDraftPanelParams } from '@/app/core/types/debug-workspace.types';
import { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { TDraftOption } from '@/app/shared/services/draft-runtime.service';
import { GenericComponentBuilder } from '@/app/shared/utility/generic-component-builder.utility';

const DRAFT_PANEL_CLASSES = 'ank-position-fixed ank-bottom-16px ank-left-16px ank-zIndex-1300 ank-display-flex ank-flexDirection-column ank-gap-14px ank-p-16px ank-borderRadius-18px ank-maxWidth-420px ank-color-textColor ank-bg-bgColorOPA__0_92 ank-border-1px ank-borderColor-textColorOPA__0_12 ank-backdropFilter-blurSD8pxED ank-boxShadow-0__12px__40px__rgbaSD0COM0COM0COM0_28ED';
const HEADER_ROW_CLASSES = 'ank-display-flex ank-alignItems-center ank-justifyContent-spaceMINbetween ank-gap-12px';
const HEADER_COPY_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-8px ank-flex-1';
const TITLE_BLOCK_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-4px';
const ACTIVE_CARD_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-4px ank-p-12px ank-borderRadius-12px ank-bg-textColorOPA__0_08 ank-border-1px ank-borderColor-textColorOPA__0_08';
const BUTTON_CONTAINER_CLASSES = 'ank-display-flex ank-flexWrap-wrap ank-gap-8px';
const FOOTER_ROW_CLASSES = 'ank-display-flex ank-alignItems-center ank-justifyContent-spaceMINbetween ank-gap-12px ank-flexWrap-wrap';
const COLLAPSED_SUMMARY_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-4px ank-p-12px ank-borderRadius-12px ank-bg-textColorOPA__0_06 ank-border-1px ank-borderColor-textColorOPA__0_08';
const PANEL_EYEBROW_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-gap-6px ank-width-fitMINcontent ank-px-10px ank-py-4px ank-borderRadius-24px ank-bg-accentColor ank-color-bgColor ank-fontWeight-700 ank-fontSize-11px ank-letterSpacing-0_08em ank-textTransform-uppercase';
const PANEL_TOGGLE_BUTTON_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-minHeight-36px ank-px-12px ank-py-6px ank-borderRadius-999px ank-border-1px ank-borderColor-textColorOPA__0_14 ank-bg-textColorOPA__0_04 ank-color-textColor ank-fontSize-11px ank-fontWeight-700 ank-letterSpacing-0_04em ank-textTransform-uppercase';
const REFRESH_BUTTON_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-gap-6px ank-minHeight-40px ank-px-14px ank-py-8px ank-borderRadius-12px ank-border-1px ank-borderColor-textColorOPA__0_14 ank-bg-secondaryAccentColor ank-color-bgColor ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3 ank-transition-all ank-td-200ms';
const DRAFT_BUTTON_BASE_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-gap-6px ank-minHeight-40px ank-px-12px ank-py-8px ank-borderRadius-12px ank-border-1px ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3 ank-transition-all ank-td-200ms';

const draftButtonClasses = (entryKey: string, selectedDraftKey: string): string => {
    if (selectedDraftKey === entryKey) {
        return `${ DRAFT_BUTTON_BASE_CLASSES } ank-bg-accentColor ank-color-bgColor ank-borderColor-accentColor ank-boxShadow-0__6px__18px__rgbaSD0COM123COM255COM0_22ED`;
    }

    return `${ DRAFT_BUTTON_BASE_CLASSES } ank-bg-transparent ank-color-textColor ank-borderColor-textColorOPA__0_2 ank-bgHover-textColorOPA__0_08`;
};

const buildDraftButton = (
    entry: TDraftOption,
    index: number,
    selectedDraftKey: string,
    onSelectDraft: (key: string) => void,
): TGenericComponent => GenericComponentBuilder.button(
    `debugDraftButton${ index }`,
    entry.label,
    draftButtonClasses(entry.key, selectedDraftKey),
    () => onSelectDraft(entry.key),
    {
        ariaLabel: `Open draft ${ entry.label }`,
    },
);

export const buildDebugWorkspaceDraftPanel = (
    params: TBuildDebugWorkspaceDraftPanelParams,
): TGenericComponent => {
    const draftButtons = params.draftOptions.map((entry, index) =>
        buildDraftButton(entry, index, params.selectedDraftKey, params.onSelectDraft),
    );
    const headerRow = GenericComponentBuilder.container(
        'debugDraftPanelHeaderRow',
        'header',
        HEADER_ROW_CLASSES,
        [
            GenericComponentBuilder.container(
                'debugDraftPanelHeaderCopy',
                'div',
                HEADER_COPY_CLASSES,
                [
                    GenericComponentBuilder.text(
                        'debugDraftPanelEyebrow',
                        'small',
                        `${ params.draftOptions.length } draft${ params.draftOptions.length === 1 ? '' : 's' } detected`,
                        PANEL_EYEBROW_CLASSES,
                    ),
                    GenericComponentBuilder.container(
                        'debugDraftPanelTitleBlock',
                        'div',
                        TITLE_BLOCK_CLASSES,
                        [
                            GenericComponentBuilder.text(
                                'debugDraftPanelTitle',
                                'h3',
                                'Draft Workspace',
                                'ank-m-0 ank-fontSize-18px ank-lineHeight-1_2',
                            ),
                            GenericComponentBuilder.text(
                                'debugDraftPanelDescription',
                                'p',
                                params.collapsed
                                    ? 'Current preview and draft availability at a glance.'
                                    : 'Switch the live preview to any detected draft without editing query params manually.',
                                'ank-m-0 ank-color-textColorOPA__0_72 ank-fontSize-13px ank-lineHeight-1_4',
                            ),
                        ],
                    ),
                ],
            ),
            GenericComponentBuilder.button(
                'debugDraftPanelToggleButton',
                params.collapsed ? 'Show' : 'Minimize',
                PANEL_TOGGLE_BUTTON_CLASSES,
                () => params.onToggleCollapsed(),
                {
                    ariaLabel: params.collapsed ? 'Expand draft workspace' : 'Minimize draft workspace',
                },
            ),
        ],
    );

    const collapsedSummary = GenericComponentBuilder.container(
        'debugDraftPanelCollapsedSummary',
        'div',
        COLLAPSED_SUMMARY_CLASSES,
        [
            GenericComponentBuilder.text(
                'debugDraftPanelCollapsedLabel',
                'small',
                'Current preview',
                'ank-m-0 ank-color-textColorOPA__0_56 ank-fontSize-11px ank-textTransform-uppercase ank-letterSpacing-0_08em',
            ),
            GenericComponentBuilder.text(
                'debugDraftPanelCollapsedValue',
                'p',
                params.activeDraftLabel,
                'ank-m-0 ank-fontSize-14px ank-fontWeight-700 ank-lineHeight-1_35',
            ),
            GenericComponentBuilder.text(
                'debugDraftPanelCollapsedMeta',
                'small',
                `${ params.draftOptions.length } option${ params.draftOptions.length === 1 ? '' : 's' } ready`,
                'ank-m-0 ank-color-textColorOPA__0_56 ank-fontSize-12px ank-lineHeight-1_4',
            ),
        ],
    );

    const expandedChildren: TGenericComponent[] = [
        GenericComponentBuilder.container(
            'debugDraftPanelActiveDraftCard',
            'div',
            ACTIVE_CARD_CLASSES,
            [
                GenericComponentBuilder.text(
                    'debugDraftPanelActiveLabel',
                    'small',
                    'Current preview',
                    'ank-m-0 ank-color-textColorOPA__0_56 ank-fontSize-11px ank-textTransform-uppercase ank-letterSpacing-0_08em',
                ),
                GenericComponentBuilder.text(
                    'debugDraftPanelActiveValue',
                    'p',
                    params.activeDraftLabel,
                    'ank-m-0 ank-fontSize-14px ank-fontWeight-700 ank-lineHeight-1_35',
                ),
            ],
        ),
        GenericComponentBuilder.container(
            'debugDraftPanelDraftButtons',
            'div',
            BUTTON_CONTAINER_CLASSES,
            draftButtons,
        ),
        GenericComponentBuilder.container(
            'debugDraftPanelFooterRow',
            'div',
            FOOTER_ROW_CLASSES,
            [
                GenericComponentBuilder.text(
                    'debugDraftPanelHint',
                    'small',
                    params.draftRegistryLoading ? 'Refreshing draft registry...' : 'The list auto-refreshes while debug mode is enabled.',
                    'ank-m-0 ank-color-textColorOPA__0_56 ank-fontSize-12px ank-lineHeight-1_4 ank-flex-1',
                ),
                GenericComponentBuilder.button(
                    'debugDraftRefreshButton',
                    params.draftRegistryLoading ? 'Refreshing' : 'Refresh',
                    REFRESH_BUTTON_CLASSES,
                    () => params.onRefreshDrafts(),
                    {
                        icon: 'refresh',
                        ariaLabel: 'Refresh available drafts',
                        loading: params.draftRegistryLoading,
                    },
                ),
            ],
        ),
    ];

    return GenericComponentBuilder.container(
        params.panelId,
        'aside',
        DRAFT_PANEL_CLASSES,
        [
            headerRow,
            ...(params.collapsed ? [collapsedSummary] : expandedChildren),
        ],
    );
};
