export type AccordionItem = {
  readonly id: string;
  readonly title: string;
  readonly content: string; // For initial simple implementation; can be TemplateRef later
  readonly disabled?: boolean;
};

export type AccordionMode = 'single' | 'multiple';

export type AccordionConfig = {
  readonly mode?: AccordionMode;
  readonly allowToggle?: boolean; // if single mode, allow closing the only open item
};
