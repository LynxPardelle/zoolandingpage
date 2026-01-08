
export type GenericFeatureCardConfig = {
  readonly icon?: string;
  readonly title?: string | (() => string);
  readonly description?: string | (() => string);
  readonly benefits?: readonly string[] | (() => readonly string[]);
  readonly classes?: string;
  readonly buttonLabel?: string | (() => string);
  /** Optional CTA handler. Called when the card button is pressed. */
  readonly onCta?: (title: string) => void;
};
