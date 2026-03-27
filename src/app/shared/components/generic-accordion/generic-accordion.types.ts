import { TGenericButtonConfig } from "../generic-button/generic-button.types";

export type AccordionTextValue = string | number | (() => string | number);
export type AccordionStringListValue = readonly string[] | (() => readonly string[]);

export type AccordionItem = {
  readonly id?: string;
  readonly title?: AccordionTextValue;
  readonly titleKey?: string;
  readonly content?: AccordionTextValue;
  readonly contentKey?: string;
  readonly summary?: AccordionTextValue;
  readonly summaryKey?: string;
  readonly description?: AccordionTextValue;
  readonly descriptionKey?: string;
  readonly meta?: AccordionTextValue;
  readonly metaKey?: string;
  readonly duration?: AccordionTextValue;
  readonly durationKey?: string;
  readonly detailItems?: AccordionStringListValue;
  readonly detailItemsKey?: string;
  readonly detailItemKeys?: readonly string[];
  readonly deliverables?: AccordionStringListValue;
  readonly deliverablesKey?: string;
  readonly deliverableKeys?: readonly string[];
  readonly indexLabel?: AccordionTextValue;
  readonly step?: number;
  readonly icon?: AccordionTextValue;
  readonly disabled?: boolean;
  readonly containerClasses?: string;
  readonly containerIsExpandedClasses?: string;
  readonly containerIsNotExpandedClasses?: string;
  readonly panelClasses?: string;
  readonly buttonConfig?: TGenericButtonConfig;
  readonly buttonIsExpandedClasses?: string;
  readonly buttonIsNotExpandedClasses?: string;
  readonly iconIsExpandedClasses?: string;
  readonly iconIsNotExpandedClasses?: string;
};

export type AccordionMode = 'single' | 'multiple';

export type AccordionItemsSource = {
  readonly source: 'i18n' | 'var';
  readonly path: string;
};

export type TAccordionConfig = {
  readonly mode?: AccordionMode;
  readonly allowToggle?: boolean; // if single mode, allow closing the only open item
  readonly items?: readonly AccordionItem[] | (() => readonly AccordionItem[]);
  readonly itemsSource?: AccordionItemsSource;
  readonly renderMode?: 'default' | 'detail';
  readonly activeId?: string | (() => string | null | undefined);
  readonly activeIds?: readonly string[] | (() => readonly string[]);
  readonly scrollBehavior?: 'none' | 'center';
  readonly containerClasses?: string;
  readonly defaultItemContainerClasses?: string;
  readonly defaultItemContainerIsExpandedClasses?: string;
  readonly defaultItemContainerIsNotExpandedClasses?: string;
  readonly defaultItemButtonConfig?: TGenericButtonConfig;
  readonly defaultItemButtonIsExpandedClasses?: string;
  readonly defaultItemButtonIsNotExpandedClasses?: string;
  readonly defaultItemPanelClasses?: string;
  readonly defaultItemIconIsExpandedClasses?: string;
  readonly defaultItemIconIsNotExpandedClasses?: string;
  readonly buttonContentClasses?: string;
  readonly indexLabelClasses?: string;
  readonly indexLabelIsExpandedClasses?: string;
  readonly indexLabelIsNotExpandedClasses?: string;
  readonly titleClasses?: string;
  readonly summaryClasses?: string;
  readonly detailContainerClasses?: string;
  readonly detailHeaderClasses?: string;
  readonly detailIconClasses?: string;
  readonly detailTitleClasses?: string;
  readonly detailMetaClasses?: string;
  readonly detailSummaryClasses?: string;
  readonly detailContentLabel?: AccordionTextValue;
  readonly detailContentLabelClasses?: string;
  readonly detailContentClasses?: string;
  readonly detailItemsLabel?: AccordionTextValue;
  readonly detailItemsLabelClasses?: string;
  readonly detailListClasses?: string;
  readonly detailListItemClasses?: string;
  readonly toggleIconName?: string;
};
