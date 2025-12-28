import type { FeatureItem } from './features-section.types';

export const FEATURES_SECTION_BASE_CLASSES: string[] = ["ank-bg-secondaryBgColor ank-borderRadius-1rem ank-p-1_5rem cardHover ank-textAlign-center ank-border-1px ank-borderColor-border ank-h-calcSD100per__MIN__3remED"];

export const FEATURE_CARD_ANIMATION = 'fadeIn';

export function buildFeatureTrackId(f: FeatureItem): string {
  return f.title.toLowerCase().replace(/\s+/g, '-');
}
