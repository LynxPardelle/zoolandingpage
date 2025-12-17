export type AccordionItem = {
  readonly id: string;
  readonly title: string;
  readonly content: string; // For initial simple implementation; can be TemplateRef later
  readonly disabled?: boolean;
  readonly accordionItemContainerClasses?: string;
  readonly accordionItemContainerIsExpandedClasses?: string;
  readonly accordionItemContainerIsNotExpandedClasses?: string;
  readonly accordionItemButtonClasses?: string;
  readonly accordionItemPanelClasses?: string;
  readonly accordionItemButtonIsExpandedClasses?: string;
  readonly accordionItemButtonIsNotExpandedClasses?: string;
};

export type AccordionMode = 'single' | 'multiple';

export type AccordionConfig = {
  readonly mode?: AccordionMode;
  readonly allowToggle?: boolean; // if single mode, allow closing the only open item
  readonly accordionContainerClasses?: string;
  readonly accordionDefaultItemContainerClasses?: string;
  readonly accordionDefaultItemContainerIsExpandedClasses?: string;
  readonly accordionDefaultItemContainerIsNotExpandedClasses?: string;
  readonly accordionDefaultItemButtonClasses?: string;
  readonly accordionDefaultItemPanelClasses?: string;
  readonly accordionDefaultItemButtonIsExpandedClasses?: string;
  readonly accordionDefaultItemButtonIsNotExpandedClasses?: string;
};
