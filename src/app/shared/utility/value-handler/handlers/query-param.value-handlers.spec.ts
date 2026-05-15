import { readQueryParamFromSearch } from './query-param.value-handlers';

describe('query param value handlers', () => {
    it('reads a query param value from the current URL', () => {
        expect(readQueryParamFromSearch('?pageSize=8', 'pageSize')).toBe('8');
    });

    it('falls back when the query param is empty or missing', () => {
        expect(readQueryParamFromSearch('?type=', 'type') ?? 'all').toBe('all');
        expect(readQueryParamFromSearch('?type=', 'pageSize') ?? 4).toBe(4);
    });

    it('uses an empty string as the default fallback when none is provided', () => {
        expect(readQueryParamFromSearch('', 'pokemon') ?? '').toBe('');
    });
});
