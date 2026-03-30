export type SearchSuggestion = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly href?: string;
  readonly target?: '_self' | '_blank' | '_parent' | '_top';
};
export type SearchBoxConfig = {
  readonly minLength?: number; // default 2
  readonly debounceMs?: number; // default 200
  readonly ariaLabel?: string;
  readonly placeholder?: string;
  readonly classes?: string;
  readonly inputClasses?: string;
  readonly resultsClasses?: string;
  readonly collapsed?: boolean;
  readonly triggerIcon?: string;
  readonly closeIcon?: string;
  readonly triggerAriaLabel?: string;
  readonly closeAriaLabel?: string;
  readonly triggerClasses?: string;
  readonly resultItemClasses?: string;
  readonly statusItemClasses?: string;
  readonly panelClasses?: string;
  readonly panelContentClasses?: string;
  readonly panelInputWrapperClasses?: string;
  readonly historyEnabled?: boolean; // default false
  readonly historyLimit?: number; // default 5
  readonly maxResults?: number;
  readonly suggestions?: readonly SearchSuggestion[];
};
