/**
 * Layout Types - Foundation Components
 *
 * Core type definitions for layout components following MANDATORY requirements:
 * - Use 'type' keyword only (NO interfaces/enums)
 * - Keep atomic and focused
 */

// Header navigation item type
export type THeaderNavItem = {
  readonly label: string;
  readonly href: string;
  readonly isActive: boolean;
  readonly isExternal: boolean;
};
