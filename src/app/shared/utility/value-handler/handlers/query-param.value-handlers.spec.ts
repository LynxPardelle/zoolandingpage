import { queryParamOrValueHandler, queryParamValueHandler } from './query-param.value-handlers';

describe('query param value handlers', () => {
    afterEach(() => {
        window.history.replaceState({}, '', '/context.html');
    });

    it('reads a query param value from the current URL', () => {
        window.history.replaceState({}, '', '/?pageSize=8');
        const handler = queryParamValueHandler();

        expect(handler.resolve({ component: {} as any, host: null }, ['pageSize'])).toBe('8');
    });

    it('falls back when the query param is empty or missing', () => {
        window.history.replaceState({}, '', '/?type=');
        const handler = queryParamOrValueHandler();

        expect(handler.resolve({ component: {} as any, host: null }, ['type', 'all'])).toBe('all');
        expect(handler.resolve({ component: {} as any, host: null }, ['pageSize', 4])).toBe(4);
    });

    it('uses an empty string as the default fallback when none is provided', () => {
        window.history.replaceState({}, '', '/');
        const handler = queryParamOrValueHandler();

        expect(handler.resolve({ component: {} as any, host: null }, ['pokemon'])).toBe('');
    });
});
