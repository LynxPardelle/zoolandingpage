import { TGenericButtonConfig } from "../generic-button/generic-button.types";


export type AccordionItem = {
  readonly id: string;
  readonly title: string | (() => string);
  readonly content: string | (() => string); // For initial simple implementation; can be TemplateRef later
  readonly disabled?: boolean;
  readonly containerClasses?: string;
  readonly containerIsExpandedClasses?: string;
  readonly containerIsNotExpandedClasses?: string;
  readonly panelClasses?: string;
  readonly buttonConfig?: TGenericButtonConfig
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
};
