import type { FeatureItem } from './features-section.types';

export const FEATURES_SECTION_BASE_CLASSES: string[] = ['ank-textAlign-center'];

export const FEATURE_CARD_ANIMATION = 'fadeIn';

export function buildFeatureTrackId(f: FeatureItem): string {
  return f.title.toLowerCase().replace(/\s+/g, '-');
}
