import { readRouteParamFromSnapshot } from './route-param.value-handlers';

describe('route param value handlers', () => {
    it('reads the deepest matching route param from an activated route snapshot tree', () => {
        const snapshot = {
            params: { draftDomain: 'zoositioweb.com.mx' },
            children: [
                {
                    params: { id: 'art_123' },
                    children: [],
                },
            ],
        } as never;

        expect(readRouteParamFromSnapshot(snapshot, 'id')).toBe('art_123');
    });

    it('falls back when the route param is missing or blank', () => {
        const snapshot = {
            params: { id: '   ' },
            children: [],
        } as never;

        expect(readRouteParamFromSnapshot(snapshot, 'id') ?? 'missing').toBe('missing');
        expect(readRouteParamFromSnapshot(snapshot, '') ?? 'missing').toBe('missing');
    });
});
