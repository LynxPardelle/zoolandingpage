
export type GenericFeatureCardConfig = {
  readonly icon?: string;
  readonly title?: string;
  readonly description?: string;
  readonly benefits?: readonly string[];
  readonly classes?: string;
  readonly buttonLabel?: string;
  /** Optional CTA handler. Called when the card button is pressed. */
  readonly onCta?: (title: string) => void;
};
