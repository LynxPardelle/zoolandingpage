type TAngoraCssNamesParsed = Record<string, string | readonly string[]>;

const CLASS_PROPERTY_PATTERN = /(^classes$|classes$|^classname$|classname$)/i;
const LONGHAND_MAP_CACHE = new WeakMap<object, readonly (readonly [string, string])[]>();

function toCamelCase(value: string): string {
    return value.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function buildLonghandMap(cssNamesParsed: TAngoraCssNamesParsed): Map<string, string> {
    const entries = new Map<string, string>();

    Object.entries(cssNamesParsed ?? {}).forEach(([abbreviation, value]) => {
        if (typeof value !== 'string' || !value.trim()) {
            return;
        }

        const normalizedValue = value.trim();
        const camelCaseValue = toCamelCase(normalizedValue);

        if (!entries.has(normalizedValue)) {
            entries.set(normalizedValue, abbreviation);
        }

        if (!entries.has(camelCaseValue)) {
            entries.set(camelCaseValue, abbreviation);
        }
    });

    return new Map(
        Array.from(entries.entries()).sort(([left], [right]) => right.length - left.length)
    );
}

function getLonghandEntries(cssNamesParsed: TAngoraCssNamesParsed): readonly (readonly [string, string])[] {
    if (!cssNamesParsed || typeof cssNamesParsed !== 'object') {
        return [];
    }

    const cached = LONGHAND_MAP_CACHE.get(cssNamesParsed);
    if (cached) {
        return cached;
    }

    const entries = Array.from(buildLonghandMap(cssNamesParsed).entries());
    LONGHAND_MAP_CACHE.set(cssNamesParsed, entries);
    return entries;
}

export function normalizeAngoraClassToken(
    token: string,
    cssNamesParsed: TAngoraCssNamesParsed,
    indicatorClass = 'ank',
): string {
    const normalizedToken = String(token ?? '').trim();
    const normalizedIndicator = String(indicatorClass ?? '').trim();

    if (!normalizedToken || !normalizedIndicator || !normalizedToken.startsWith(`${ normalizedIndicator }-`)) {
        return normalizedToken;
    }

    const tokenBody = normalizedToken.slice(normalizedIndicator.length + 1);
    if (!tokenBody.includes('-')) {
        return normalizedToken;
    }

    for (const [longhand, abbreviation] of getLonghandEntries(cssNamesParsed)) {
        if (tokenBody.startsWith(`${ longhand }-`)) {
            return `${ normalizedIndicator }-${ abbreviation }${ tokenBody.slice(longhand.length) }`;
        }
    }

    return normalizedToken;
}

export function normalizeAngoraClassList(
    value: string,
    cssNamesParsed: TAngoraCssNamesParsed,
    indicatorClass = 'ank',
): string {
    const normalizedValue = String(value ?? '').trim();
    const normalizedIndicator = String(indicatorClass ?? '').trim();

    if (!normalizedValue || !normalizedIndicator || !normalizedValue.includes(`${ normalizedIndicator }-`)) {
        return normalizedValue;
    }

    return normalizedValue
        .split(/\s+/)
        .map((token) => normalizeAngoraClassToken(token, cssNamesParsed, indicatorClass))
        .filter((token) => token.length > 0)
        .join(' ');
}

export function normalizeClassBearingValueDeep<TValue>(
    value: TValue,
    cssNamesParsed: TAngoraCssNamesParsed,
    indicatorClass = 'ank',
): TValue {
    if (Array.isArray(value)) {
        let nextArray: unknown[] | null = null;

        value.forEach((entry, index) => {
            const normalizedEntry = normalizeClassBearingValueDeep(entry, cssNamesParsed, indicatorClass);
            if (normalizedEntry !== entry) {
                nextArray ??= [...value];
                nextArray[index] = normalizedEntry;
            }
        });

        return (nextArray ?? value) as TValue;
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    const record = value as Record<string, unknown>;
    let nextRecord: Record<string, unknown> | null = null;

    Object.entries(record).forEach(([key, entry]) => {
        const normalizedEntry = typeof entry === 'string' && CLASS_PROPERTY_PATTERN.test(key)
            ? normalizeAngoraClassList(entry, cssNamesParsed, indicatorClass)
            : normalizeClassBearingValueDeep(entry, cssNamesParsed, indicatorClass);

        if (normalizedEntry !== entry) {
            nextRecord ??= { ...record };
            nextRecord[key] = normalizedEntry;
        }
    });

    return (nextRecord ?? value) as TValue;
}
