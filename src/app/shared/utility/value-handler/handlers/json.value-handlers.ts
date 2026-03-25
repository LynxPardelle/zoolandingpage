import type { ValueHandler } from '../value-handler.types';

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export const jsonValueHandler = (): ValueHandler => ({
    id: 'json',
    resolve: (_ctx, args) => {
        const value = args?.[0];
        const spacingArg = args?.[1];
        const shouldEscape = Boolean(args?.[2] ?? false);
        const spacing = Number.isFinite(Number(spacingArg))
            ? Math.max(0, Math.min(8, Number(spacingArg)))
            : 0;

        if (value === undefined) return '';

        try {
            const serialized = JSON.stringify(value, null, spacing);
            if (serialized == null) return '';
            return shouldEscape ? escapeHtml(serialized) : serialized;
        } catch {
            return '';
        }
    },
});
