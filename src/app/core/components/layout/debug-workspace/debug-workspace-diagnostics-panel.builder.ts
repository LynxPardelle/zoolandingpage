import { TBuildDebugWorkspaceDiagnosticsPanelParams } from '@/app/core/types/debug-workspace.types';
import { TGenericComponent } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types';
import { GenericComponentBuilder } from '@/app/shared/utility/generic-component-builder.utility';

const DIAGNOSTICS_PANEL_CLASSES = 'ank-position-fixed ank-bottom-16px ank-right-16px ank-zIndex-1300 ank-display-flex ank-flexDirection-column ank-gap-14px ank-p-16px ank-borderRadius-18px ank-maxWidth-420px ank-color-white ank-bg-bgColorOPA__0_92 ank-border-1px ank-borderColor-textColorOPA__0_12 ank-backdropFilter-blurSD8pxED ank-boxShadow-0__12px__40px__rgbaSD0COM0COM0COM0_28ED';
const HEADER_ROW_CLASSES = 'ank-display-flex ank-alignItems-center ank-justifyContent-spaceMINbetween ank-gap-12px';
const HEADER_COPY_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-8px ank-flex-1';
const TITLE_BLOCK_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-4px';
const PANEL_EYEBROW_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-gap-6px ank-width-fitMINcontent ank-px-10px ank-py-4px ank-borderRadius-24px ank-bg-secondaryAccentColor ank-color-textColor ank-fontWeight-700 ank-fontSize-11px ank-letterSpacing-0_08em ank-textTransform-uppercase';
const PANEL_TOGGLE_BUTTON_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-minHeight-36px ank-px-12px ank-py-6px ank-borderRadius-999px ank-border-1px ank-borderColor-textColorOPA__0_14 ank-bg-textColorOPA__0_04 ank-color-white ank-fontSize-11px ank-fontWeight-700 ank-letterSpacing-0_04em ank-textTransform-uppercase';
const ACTION_ROW_CLASSES = 'ank-display-flex ank-flexWrap-wrap ank-gap-8px';
const ACTION_BUTTON_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-gap-6px ank-minHeight-40px ank-px-14px ank-py-8px ank-borderRadius-12px ank-border-1px ank-borderColor-textColorOPA__0_14 ank-bg-textColorOPA__0_04 ank-color-white ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3 ank-transition-all ank-td-200ms';
const SECTION_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-8px ank-p-12px ank-borderRadius-14px ank-bg-textColorOPA__0_05 ank-border-1px ank-borderColor-textColorOPA__0_08';
const LIST_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-8px ank-m-0 ank-p-0 ank-listStyle-none';
const LIST_ITEM_CLASSES = 'ank-display-flex ank-flexDirection-column ank-gap-4px ank-p-10px ank-borderRadius-12px ank-bg-textColorOPA__0_06 ank-border-1px ank-borderColor-textColorOPA__0_06';
const COLLAPSED_SUMMARY_CLASSES = 'ank-display-flex ank-flexWrap-wrap ank-gap-8px';
const SUMMARY_BADGE_CLASSES = 'ank-display-inlineFlex ank-alignItems-center ank-gap-6px ank-px-10px ank-py-6px ank-borderRadius-999px ank-bg-textColorOPA__0_06 ank-border-1px ank-borderColor-textColorOPA__0_08 ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3';

const buildDebugListItem = (id: string, text: string): TGenericComponent =>
    GenericComponentBuilder.container(id, 'li', LIST_ITEM_CLASSES, [
        GenericComponentBuilder.text(`${ id }Text`, 'span', text, 'ank-fontSize-12px ank-lineHeight-1_45'),
    ]);

const buildSummaryBadge = (id: string, text: string): TGenericComponent =>
    GenericComponentBuilder.text(id, 'span', text, SUMMARY_BADGE_CLASSES);

export const buildDebugWorkspaceDiagnosticsPanel = (
    params: TBuildDebugWorkspaceDiagnosticsPanelParams,
): TGenericComponent => {
    const children: TGenericComponent[] = [
        GenericComponentBuilder.container(
            'debugDiagnosticsPanelHeaderRow',
            'header',
            HEADER_ROW_CLASSES,
            [
                GenericComponentBuilder.container(
                    'debugDiagnosticsPanelHeaderCopy',
                    'div',
                    HEADER_COPY_CLASSES,
                    [
                        GenericComponentBuilder.text(
                            'debugDiagnosticsPanelEyebrow',
                            'small',
                            `${ params.recentEvents.length } recent event${ params.recentEvents.length === 1 ? '' : 's' }`,
                            PANEL_EYEBROW_CLASSES,
                        ),
                        GenericComponentBuilder.container(
                            'debugDiagnosticsPanelTitleBlock',
                            'div',
                            TITLE_BLOCK_CLASSES,
                            [
                                GenericComponentBuilder.text(
                                    'debugDiagnosticsPanelTitle',
                                    'h3',
                                    'Event Viewer',
                                    'ank-m-0 ank-fontSize-18px ank-lineHeight-1_2',
                                ),
                                GenericComponentBuilder.text(
                                    'debugDiagnosticsPanelDescription',
                                    'p',
                                    params.collapsed
                                        ? 'Runtime activity summary for the current draft session.'
                                        : 'Inspect analytics activity, payload tooling, and validation health in one place.',
                                    'ank-m-0 ank-color-whiteOPA__0_72 ank-fontSize-13px ank-lineHeight-1_4',
                                ),
                            ],
                        ),
                    ],
                ),
                GenericComponentBuilder.button(
                    'debugDiagnosticsPanelToggleButton',
                    params.collapsed ? 'Show' : 'Minimize',
                    PANEL_TOGGLE_BUTTON_CLASSES,
                    () => params.onToggleCollapsed(),
                    {
                        ariaLabel: params.collapsed ? 'Expand event viewer' : 'Minimize event viewer',
                    },
                ),
            ],
        ),
    ];

    if (params.collapsed) {
        children.push(
            GenericComponentBuilder.container(
                'debugDiagnosticsPanelCollapsedSummary',
                'div',
                COLLAPSED_SUMMARY_CLASSES,
                [
                    buildSummaryBadge(
                        'debugDiagnosticsPanelEventsBadge',
                        `${ params.recentEvents.length } event${ params.recentEvents.length === 1 ? '' : 's' }`,
                    ),
                    buildSummaryBadge(
                        'debugDiagnosticsPanelIssuesBadge',
                        `${ params.configIssues.length } issue${ params.configIssues.length === 1 ? '' : 's' }`,
                    ),
                ],
            ),
        );

        return GenericComponentBuilder.container(params.panelId, 'aside', DIAGNOSTICS_PANEL_CLASSES, children);
    }

    children.push(
        GenericComponentBuilder.container(
            'debugDiagnosticsActionRow',
            'div',
            ACTION_ROW_CLASSES,
            [
                GenericComponentBuilder.translatedEventButton(
                    'debugDownloadDraftPayloadsButton',
                    'ui.debugPanel.downloadDraftPayloads',
                    'downloadDraftPayloads',
                    ACTION_BUTTON_CLASSES,
                ),
                GenericComponentBuilder.translatedEventButton(
                    'debugWriteDraftsToDiskButton',
                    'ui.debugPanel.writeDraftsToDisk',
                    'writeDraftsToDisk',
                    ACTION_BUTTON_CLASSES,
                ),
            ],
        ),
    );

    if (params.configIssues.length > 0) {
        children.push(
            GenericComponentBuilder.container(
                'debugConfigIssuesSection',
                'section',
                SECTION_CLASSES,
                [
                    GenericComponentBuilder.translatedText(
                        'debugConfigIssuesTitle',
                        'p',
                        'ui.debugPanel.configIssues',
                        'ank-m-0 ank-fontWeight-700 ank-fontSize-12px ank-letterSpacing-0_04em ank-textTransform-uppercase ank-color-whiteOPA__0_72',
                    ),
                    GenericComponentBuilder.container(
                        'debugConfigIssuesList',
                        'ul',
                        LIST_CLASSES,
                        params.configIssues.map((issue, index) => buildDebugListItem(`debugConfigIssue${ index }`, issue)),
                    ),
                ],
            ),
        );
    }

    children.push(
        GenericComponentBuilder.container(
            'debugAnalyticsEventsSection',
            'section',
            SECTION_CLASSES,
            [
                GenericComponentBuilder.translatedText(
                    'debugAnalyticsLatestTitle',
                    'p',
                    'ui.debugPanel.analyticsLatest',
                    'ank-m-0 ank-fontWeight-700 ank-fontSize-12px ank-letterSpacing-0_04em ank-textTransform-uppercase ank-color-whiteOPA__0_72',
                ),
                GenericComponentBuilder.container(
                    'debugAnalyticsEventsList',
                    'ul',
                    LIST_CLASSES,
                    params.recentEvents.length > 0
                        ? params.recentEvents.map((eventLabel, index) => buildDebugListItem(`debugAnalyticsEvent${ index }`, eventLabel))
                        : [buildDebugListItem('debugAnalyticsEventEmpty', 'No events recorded yet.')],
                ),
            ],
        ),
    );

    return GenericComponentBuilder.container(params.panelId, 'aside', DIAGNOSTICS_PANEL_CLASSES, children);
};
