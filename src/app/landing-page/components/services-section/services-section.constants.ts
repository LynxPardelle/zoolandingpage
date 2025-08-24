import type { ServiceItem } from './services-section.types';

export const SERVICES_SECTION_BASE_CLASSES: string[] = ['ank-textAlign-center'];

export function serviceColorBarClass(s: ServiceItem): string {
  return 'ank-bg-' + s.color;
}
