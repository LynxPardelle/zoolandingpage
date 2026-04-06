import type { ValueHandler } from '../value-handler.types';

export const concatValueHandler = (): ValueHandler => ({
    id: 'concat',
    resolve: (_ctx, args) => (args ?? []).map((a) => (a == null ? '' : String(a))).join(''),
});
