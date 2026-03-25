import { jsonValueHandler } from './json.value-handlers';

describe('json.value-handlers', () => {
    it('stringifies values with spacing and optional HTML escaping', () => {
        const handler = jsonValueHandler();

        const escaped = handler.resolve({} as never, [{ note: '<strong>test</strong>' }, 2, true]);
        const raw = handler.resolve({} as never, [{ ok: true }, 0, false]);

        expect(String(escaped)).toContain('&lt;strong&gt;test&lt;/strong&gt;');
        expect(String(escaped)).toContain('&quot;note&quot;');
        expect(raw).toBe('{"ok":true}');
    });
});
