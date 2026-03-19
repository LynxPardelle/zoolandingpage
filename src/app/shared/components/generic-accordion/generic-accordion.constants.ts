import { TAccordionConfig } from './generic-accordion.types';

export const DEFAULT_ACCORDION_CONFIG: Omit<TAccordionConfig, 'items'> = {
  mode: 'single',
  allowToggle: true,
  containerClasses: 'accContainer',
  defaultItemContainerClasses: 'accItemContainer',
  defaultItemContainerIsExpandedClasses: 'accItemExpandedContainer',
  defaultItemContainerIsNotExpandedClasses: 'accItemNotExpandedContainer',
  defaultItemButtonConfig: {
    classes: 'accItemButton',
    iconClasses: 'accItemButtonIcon'
  },
  defaultItemButtonIsExpandedClasses: 'accItemButtonIsExpanded',
  defaultItemButtonIsNotExpandedClasses: 'accItemButtonIsNotExpanded',
  defaultItemPanelClasses: 'accItemPanel',
};
