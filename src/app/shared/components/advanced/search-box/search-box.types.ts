export type SearchSuggestion = { readonly id: string; readonly label: string };
export type SearchBoxFetcher = (term: string) => Promise<readonly SearchSuggestion[]> | readonly SearchSuggestion[];
export type SearchBoxConfig = {
  readonly minLength?: number; // default 2
  readonly debounceMs?: number; // default 200
  readonly ariaLabel?: string;
  readonly placeholder?: string;
};
