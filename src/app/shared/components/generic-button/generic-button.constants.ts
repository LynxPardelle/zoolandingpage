import type { ButtonSize, ButtonVariant } from './generic-button.types';

export const GENERIC_BUTTON_BASE = [
  'btnBase', // predefined combo (padding, radius, transition)
  'ank-inlineFlex ank-alignItems-center ank-justifyContent-center',
  'ank-gap-0_5rem ank-fontWeight-500 ank-textDecoration-none',
  'ank-transition-all__200ms ank-position-relative',
  'ank-outlineColor-focusRingColor',
].join(' ');

/**
 * Build variant classes dynamically so any theme color key can be used.
 * Assumes angora generates btn/btnOutline combos following naming convention:
 *  ank-btn-{colorKey}
 *  ank-btnOutline-{colorKey}-bgColor
 * Fallbacks gracefully if combos missing by combining generic background / color utilities.
 */
export const buildVariantClass = (variant: ButtonVariant, bg: string, text: string = 'textColor'): string => {
  switch (variant) {
    case 'primary':
    case 'secondary':
      // Treat secondary same as primary but consumer chooses colorKey
      return `ank-btn-${bg} ank-color-${text}`;
    case 'outline':
      return `ank-bg-transparent ank-border-2px__solid__${bg} ank-color-${bg} ank-btnHover-${bg} ank-colorHover-${text}`;
    case 'ghost':
      return `ank-bg-transparent ank-color-${text} ank-opacity-80 ank-opacityHover-100`;
    default:
      return `ank-btn-${bg}`;
  }
};

export const GENERIC_BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'ank-px-0_75rem ank-py-0_5rem ank-fs-0_875rem',
  md: 'ank-px-1_25rem ank-py-0_75rem ank-fs-1rem',
  lg: 'ank-px-1_5rem ank-py-1rem ank-fs-1_125rem',
};

export const GENERIC_BUTTON_ICON_CLASS = 'ank-fs-1_25rem ank-lineHeight-1';
export const GENERIC_BUTTON_SPINNER_CLASS = [
  'ank-display-inlineBlock ank-width-1rem ank-height-1rem',
  'ank-border-2px ank-borderStyle-solid ank-borderColor-secondaryLinkColor',
  'ank-borderTopColor-transparent ank-borderRadius-99rem',
  'ank-and-1s',
  'ank-antf-linear',
  'ank-anic-infinite',
  'spinAnimation',
].join(' ');
