export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Public inputs for the Generic Button component.
 * Keeping it intentionally small to avoid scope creep.
 */
export type GenericButtonInputs = {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Theme color token key (e.g. accentColor, secondaryLinkColor, linkColor, success, warning ...) */
  readonly colorKey?: string;
  readonly label?: string; // If omitted, consumers can project content
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly icon?: string; // Material icon name (leading icon)
  readonly type?: 'button' | 'submit' | 'reset';
};
