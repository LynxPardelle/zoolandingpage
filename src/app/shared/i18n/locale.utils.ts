export const normalizeLocaleCode = (value: unknown): string => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    return raw
        .replace(/_/g, '-')
        .split('-')
        .filter(Boolean)
        .map((part, index) => {
            if (index === 0) return part.toLowerCase();
            if (part.length === 4) return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            if (part.length <= 3) return part.toUpperCase();
            return part.toLowerCase();
        })
        .join('-');
};

export const getLocaleCandidates = (value: unknown): readonly string[] => {
    const normalized = normalizeLocaleCode(value);
    if (!normalized) return [];

    const [language] = normalized.split('-');
    return language && language !== normalized ? [normalized, language] : [normalized];
};

export const resolveBestLocaleMatch = (preferred: unknown, available: readonly string[]): string | null => {
    const normalizedAvailable = available
        .map((code) => normalizeLocaleCode(code))
        .filter(Boolean);

    if (normalizedAvailable.length === 0) return null;

    const preferredCandidates = getLocaleCandidates(preferred);
    if (preferredCandidates.length === 0) return null;

    for (const candidate of preferredCandidates) {
        const exact = normalizedAvailable.find((code) => code === candidate);
        if (exact) return exact;
    }

    const preferredLanguage = preferredCandidates[preferredCandidates.length - 1];
    const sameBase = normalizedAvailable.find((code) => code.split('-')[0] === preferredLanguage);
    return sameBase ?? null;
};

export const formatLocaleLabel = (value: unknown): string => {
    const normalized = normalizeLocaleCode(value);
    if (!normalized) return '';
    return normalized.toUpperCase();
};

export const toOpenGraphLocale = (value: unknown): string => normalizeLocaleCode(value).replace(/-/g, '_');
