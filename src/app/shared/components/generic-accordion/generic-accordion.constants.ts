import { AccordionConfig } from './generic-accordion.types';

export const DEFAULT_ACCORDION_CONFIG: Omit<AccordionConfig, 'items'> = {
  mode: 'single',
  allowToggle: true,
  containerClasses: 'ank-display-flex ank-flexDirection-column ank-gap-0_25rem',
  defaultItemContainerClasses: 'ank-borderRadius-0_5rem',
  defaultItemContainerIsExpandedClasses: 'ank-bg-accentColor',
  defaultItemContainerIsNotExpandedClasses: 'ank-bg-secondaryBgColor',
  defaultItemButtonConfig: {
    classes: 'ank-outline-2px__solid__secondaryAccentColor ank-m-8px ank-color-textColor ank-borderRadius-0_25rem ank-border-0 ank-width-100per ank-textAlign-left ank-padding-0_75rem ank-fontWeight-600 ank-transition-all ank-bgHover-secondaryAccentColor ank-colorHover-titleColor ank-cursor-pointer ank-display-flex ank-justifyContent-spaceMINbetween ank-alignItems-center ank-w-calcSD100per__MIN__16pxED',
    iconClasses: 'ank-transition-transform ank-transformOrigin-center ank-fontSize-1_25rem ank-color-textColor'
  },
  defaultItemButtonIsExpandedClasses: 'ank-bg-secondaryAccentColor',
  defaultItemButtonIsNotExpandedClasses: 'ank-bg-transparent',
  defaultItemPanelClasses: 'ank-overflow-hidden ank-paddingInline-0_75rem ank-paddingBlock-0_5rem ank-color-textColor',
};
