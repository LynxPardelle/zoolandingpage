/**
 * AppContainer Constants
 *
 * Constants and default values for AppContainer component.
 * Following MANDATORY atomic file structure (keep under 80 lines).
 */

import { ContainerAlignment, ContainerSize } from '../../../types/layout.types';

// Default container configuration
export const APP_CONTAINER_DEFAULTS = {
  size: 'lg' as ContainerSize,
  alignment: 'center' as ContainerAlignment,
  className: '',
} as const;

// Container size mappings for ngx-angora-css classes
export const CONTAINER_SIZE_CLASSES: Record<ContainerSize, string> = {
  sm: 'ank-maxWidth-640px',
  md: 'ank-maxWidth-768px',
  lg: 'ank-maxWidth-1024px',
  xl: 'ank-maxWidth-1280px',
  full: 'ank-maxWidth-full',
} as const;

// Container alignment classes
export const CONTAINER_ALIGNMENT_CLASSES: Record<ContainerAlignment, string> = {
  left: 'ank-marginRight-auto',
  center: 'ank-marginLeft-auto ank-marginRight-auto',
  right: 'ank-marginLeft-auto',
} as const;

// Base container classes using ngx-angora-css
export const BASE_CONTAINER_CLASSES = ['ank-width-100vw', 'ank-px-1rem', 'ank-boxSizing-borderMINbox'] as const;
