import { AccordionConfig } from './accordion.types';

export const DEFAULT_ACCORDION_CONFIG: Required<Pick<AccordionConfig, 'mode' | 'allowToggle'>> = {
  mode: 'single',
  allowToggle: true,
};
