export type TMetadataTemplateContext = {
    readonly getVariable: (path: string) => unknown;
    readonly getQueryParam: (key: string) => unknown;
};

type TMetadataToken = {
    readonly source: 'var' | 'query';
    readonly key: string;
    readonly transforms: readonly string[];
};

const TOKEN_PATTERN = /\{\{\s*(var|query)\s*:\s*([^}|]+?)\s*((?:\|[^}]+)*)\}\}/g;
const WHOLE_TOKEN_PATTERN = /^\s*\{\{\s*(var|query)\s*:\s*([^}|]+?)\s*((?:\|[^}]+)*)\}\}\s*$/;

export function resolveMetadataTemplates(value: unknown, context: TMetadataTemplateContext): unknown {
    if (typeof value === 'string') {
        return resolveMetadataTemplateString(value, context);
    }

    if (Array.isArray(value)) {
        return value.map((entry) => resolveMetadataTemplates(entry, context));
    }

    if (isRecord(value)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, resolveMetadataTemplates(entry, context)]),
        );
    }

    return value;
}

export function resolveMetadataTemplateString(value: string, context: TMetadataTemplateContext): unknown {
    const wholeMatch = value.match(WHOLE_TOKEN_PATTERN);
    if (wholeMatch) {
        return resolveMetadataToken(parseMetadataToken(wholeMatch), context);
    }

    return value.replace(TOKEN_PATTERN, (_match, source: string, key: string, transformSuffix: string) => {
        const resolved = resolveMetadataToken({ source: normalizeSource(source), key: key.trim(), transforms: parseTransforms(transformSuffix) }, context);
        return stringifyTemplateValue(resolved);
    });
}

function parseMetadataToken(match: RegExpMatchArray): TMetadataToken {
    return {
        source: normalizeSource(match[1]),
        key: String(match[2] ?? '').trim(),
        transforms: parseTransforms(String(match[3] ?? '')),
    };
}

function normalizeSource(source: string): 'var' | 'query' {
    return source === 'query' ? 'query' : 'var';
}

function parseTransforms(value: string): readonly string[] {
    return value
        .split('|')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function resolveMetadataToken(token: TMetadataToken, context: TMetadataTemplateContext): unknown {
    const value = token.source === 'query'
        ? context.getQueryParam(token.key)
        : context.getVariable(token.key);

    return applyTransforms(value, token.transforms);
}

function applyTransforms(value: unknown, transforms: readonly string[]): unknown {
    if (value == null || transforms.length === 0) {
        return value;
    }

    return transforms.reduce<unknown>((current, transform) => {
        if (current == null) {
            return current;
        }

        const normalized = transform.trim().toLowerCase();
        const text = String(current);

        switch (normalized) {
            case 'trim':
                return text.trim();
            case 'lower':
            case 'lowercase':
                return text.toLowerCase();
            case 'upper':
            case 'uppercase':
                return text.toUpperCase();
            case 'title':
            case 'titlecase':
            case 'title-case':
                return toTitleCase(text);
            case 'uricomponent':
            case 'uri-component':
            case 'encodeuricomponent':
                return encodeURIComponent(text);
            default:
                return current;
        }
    }, value);
}

function toTitleCase(value: string): string {
    return value
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function stringifyTemplateValue(value: unknown): string {
    if (value == null) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
