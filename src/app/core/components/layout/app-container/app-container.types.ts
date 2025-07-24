/**
 * AppContainer Types
 * 
 * Type definitions specific to AppContainer component.
 * Following MANDATORY requirements: use 'type' only (NO interfaces/enums).
 */

// Re-export from layout types for convenience
export type { ContainerProps, ContainerSize, ContainerAlignment } from '../../../types/layout.types';

// Import types for internal use
import type { ContainerSize, ContainerAlignment } from '../../../types/layout.types';

// Container-specific computed properties
export type ContainerClasses = {
  base: string[];
  size: string;
  alignment: string;
  custom: string;
};

// Container state for reactive updates
export type ContainerState = {
  isVisible: boolean;
  currentSize: ContainerSize;
  currentAlignment: ContainerAlignment;
};
