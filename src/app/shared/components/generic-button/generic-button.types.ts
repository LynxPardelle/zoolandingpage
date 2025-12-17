
export type GenericButtonConfig = {
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
};
