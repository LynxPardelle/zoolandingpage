/**
 * AppSection Types
 * 
 * Type definitions specific to AppSection component.
 * Following MANDATORY requirements: use 'type' only (NO interfaces/enums).
 */

// Re-export from layout types for convenience
export type { SectionProps, SectionVariant, SectionSpacing } from '../../../types/layout.types';

// Import types for internal use
import type { SectionVariant, SectionSpacing } from '../../../types/layout.types';

// Section-specific computed properties
export type SectionClasses = {
  base: string[];
  variant: string;
  spacing: string;
  custom: string;
};

// Section state for reactive updates
export type SectionState = {
  isVisible: boolean;
  currentVariant: SectionVariant;
  currentSpacing: SectionSpacing;
};
