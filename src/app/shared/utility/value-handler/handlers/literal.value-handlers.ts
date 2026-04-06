import type { ValueHandler } from '../value-handler.types';

export const literalValueHandler = (): ValueHandler => ({
    id: 'literal',
    resolve: (_ctx, args) => args?.[0] ?? '',
});
