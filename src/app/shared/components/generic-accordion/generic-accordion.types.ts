import { GenericButtonConfig } from "../generic-button/generic-button.types";

export type AccordionItem = {
  readonly id: string;
  readonly title: string;
  readonly content: string; // For initial simple implementation; can be TemplateRef later
  readonly disabled?: boolean;
  readonly containerClasses?: string;
  readonly containerIsExpandedClasses?: string;
  readonly containerIsNotExpandedClasses?: string;
  readonly panelClasses?: string;
  readonly buttonConfig?: GenericButtonConfig;
  readonly buttonIsExpandedClasses?: string;
  readonly buttonIsNotExpandedClasses?: string;
  readonly iconIsExpandedClasses?: string;
  readonly iconIsNotExpandedClasses?: string;
};

export type AccordionMode = 'single' | 'multiple';

export type AccordionConfig = {
  readonly mode?: AccordionMode;
  readonly allowToggle?: boolean; // if single mode, allow closing the only open item
  readonly items: readonly AccordionItem[];
  readonly containerClasses?: string;
  readonly defaultItemContainerClasses?: string;
  readonly defaultItemContainerIsExpandedClasses?: string;
  readonly defaultItemContainerIsNotExpandedClasses?: string;
  readonly defaultItemButtonConfig?: GenericButtonConfig;
  readonly defaultItemButtonIsExpandedClasses?: string;
  readonly defaultItemButtonIsNotExpandedClasses?: string;
  readonly defaultItemPanelClasses?: string;
  readonly defaultItemIconIsExpandedClasses?: string;
  readonly defaultItemIconIsNotExpandedClasses?: string;
};
