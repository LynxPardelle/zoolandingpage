
import type { TComponentChild } from '../component-children.types';

export type TGenericButtonConfig = {
  /** Button element ID */
  readonly id?: string;
  /** Button Classes */
  readonly classes?: string | (() => string);
  /** Native button type attribute */
  readonly type?: 'button' | 'submit' | 'reset';
  /** Optional text label; if omitted callers can project their own content */
  readonly label?: string | (() => string);
  /** Disable pointer interaction and dim the button */
  readonly disabled?: boolean | (() => boolean);
  /** Show loading state and spinner icon */
  readonly loading?: boolean | (() => boolean);
  /** Leading Material icon name */
  readonly icon?: string | (() => string);
  /** Additional classes for the icon element */
  readonly iconClasses?: string | (() => string);
  /** Position of the icon relative to the label */
  readonly iconPosition?: 'after' | 'before' | (() => 'after' | 'before');
  /** Additional classes for the spinner element */
  readonly spinnerClasses?: string | (() => string);
  /** ARIA role attribute */
  readonly role?: string | (() => string);
  /** ARIA label attribute */
  readonly ariaLabel?: string | (() => string);
  /** tabIndex attribute */
  readonly tabIndex?: number | (() => number);
  /** ARIA pressed attribute */
  readonly ariaSelected?: boolean | (() => boolean);
  /** ARIA expanded attribute */
  readonly ariaExpanded?: boolean | (() => boolean);
  /** ARIA haspopup attribute */
  readonly ariaHaspopup?: boolean | (() => boolean);
  /** ARIA controls attribute */
  readonly ariaControls?: string | (() => string);
  /** ARIA activedescendant attribute */
  readonly ariaActiveDescendant?: string | (() => string);
  /** IDs of components to render inside the button */
  readonly components?: readonly TComponentChild[];

  /** Optional handler invoked after disabled/loading guards. */
  readonly pressed?: (event: MouseEvent) => void;

  /** @deprecated Use `pressed` instead. */
  readonly onPressed?: (event: MouseEvent) => void;
};
