import { CTAVariant } from './call-to-action.types';
export const CTA_BASE_CLASSES = 'btnBase ank-fs-1_125rem';
export const CTA_VARIANT_CLASS: Record<CTAVariant, string> = {
  primary: 'ank-btn-secondaryLinkColor ank-color-secondaryTextColor',
  secondary: 'ank-btn-accentColor ank-color-textColor',
  outline: 'ank-btnOutline-secondaryLinkColor-bgColor ank-bg-transparent ank-colorHover-secondaryTextColor',
  ghost: 'ank-bg-transparent ank-color-secondaryTextColor ank-opacity-80 ank-opacityHover-100',
};
