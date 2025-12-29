
export type TGenericButtonConfig = {
  /** Button element ID */
  readonly id?: string;
  /** Button Classes */
  readonly classes?: string;
  /** Native button type attribute */
  readonly type?: 'button' | 'submit' | 'reset';
  /** Optional text label; if omitted callers can project their own content */
  readonly label?: string;
  /** Disable pointer interaction and dim the button */
  readonly disabled?: boolean;
  /** Show loading state and spinner icon */
  readonly loading?: boolean;
  /** Leading Material icon name */
  readonly icon?: string;
  /** Additional classes for the icon element */
  readonly iconClasses?: string;
  /** Position of the icon relative to the label */
  readonly iconPosition?: 'after' | 'before';
  /** Additional classes for the spinner element */
  readonly spinnerClasses?: string;
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
  /** ARIA activedescendant attribute */
  readonly ariaActiveDescendant?: string;
  /** IDs of components to render inside the button */
  readonly components?: string[];

  /** Optional handler invoked after disabled/loading guards. */
  readonly pressed?: (event: MouseEvent) => void;

  /** @deprecated Use `pressed` instead. */
  readonly onPressed?: (event: MouseEvent) => void;
};
