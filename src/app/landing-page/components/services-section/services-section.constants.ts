import type { ServiceItem } from './services-section.types';

export const SERVICES_SECTION_BASE_CLASSES: string[] = ['ank-textAlign-center'];

export function serviceColorBarClass(s: ServiceItem): string {
  return 'ank-bg-' + s.color;
}

export const SERVICES_SECTION_TITLE_CLASSES = 'ank-textAlign-center ank-mb-64px ank-fsSELCHILDh2-2rem ankfontWeightSELCHILDh2-bold ank-mbSELCHILDh2-16px ank-colorSELCHILDh2-titleColor ank-fsSELCHILDp-1_5rem ank-colorSELCHILDp-textColor ank-maxWidthSELCHILDp-700px ank-mxSELCHILDp-auto';
