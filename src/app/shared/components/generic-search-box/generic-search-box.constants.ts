export const SEARCH_BOX_MAX_RESULTS = 10;

import type { SearchSuggestion } from './generic-search-box.types';

export function filterSearchSuggestions(
    suggestions: readonly SearchSuggestion[] | null | undefined,
    term: string,
    limit: number,
): readonly SearchSuggestion[] {
    const normalizedTerm = String(term ?? '').trim().toLowerCase();
    if (!normalizedTerm || !Array.isArray(suggestions) || suggestions.length === 0) {
        return [];
    }

    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? limit : SEARCH_BOX_MAX_RESULTS;

    return suggestions
        .filter((entry) => buildSearchHaystack(entry).includes(normalizedTerm))
        .slice(0, normalizedLimit);
}

function buildSearchHaystack(entry: SearchSuggestion): string {
    return [entry.label, entry.description, entry.href]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ')
        .toLowerCase();
}
