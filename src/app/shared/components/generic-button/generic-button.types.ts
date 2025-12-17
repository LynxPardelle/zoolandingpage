
export type GenericButtonConfig = {
  /** Button element ID */
  readonly id?: string;
  /** Button Classes */
  readonly classes?: string;
  /** Optional text label; if omitted callers can project their own content */
  readonly label?: string;
  /** Disable pointer interaction and dim the button */
  readonly disabled?: boolean;
  /** Show loading state and spinner icon */
  readonly loading?: boolean;
  /** Leading Material icon name */
  readonly icon?: string;
  /** Native button type attribute */
  readonly type?: 'button' | 'submit' | 'reset';
  /** Additional classes for the spinner element */
  readonly spinnerClasses?: string;
  /** Additional classes for the icon element */
  readonly iconClasses?: string;
  /** ARIA role attribute */
  readonly role?: string;
  /** ARIA label attribute */
  readonly ariaLabel?: string;
  /** tabIndex attribute */
  readonly tabIndex?: number;
  /** ARIA pressed attribute */
  readonly ariaSelected?: boolean;
  /** ARIA expanded attribute */
  readonly ariaExpanded?: boolean;
  /** ARIA haspopup attribute */
  readonly ariaHaspopup?: boolean;
  /** ARIA controls attribute */
  readonly ariaControls?: string;
};
