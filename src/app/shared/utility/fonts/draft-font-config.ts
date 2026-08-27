import type { TDraftFontFaceConfig } from '@/app/shared/types/config-payloads.types';

export const MAX_DRAFT_FONT_FACES = 8;
// Only public file URLs: no stylesheet, credential, query, fragment, escape or traversal syntax.
export const DRAFT_FONT_SOURCE_PATTERN = '^(?!.*[\\u0000-\\u0020\\u007f])(?:/(?!/)|https://[A-Za-z0-9.-]+/)(?!\\.{1,2}/)(?!.*[/]\\.{1,2}/)[A-Za-z0-9._/-]+\\.woff2$';
const sourcePattern = new RegExp(DRAFT_FONT_SOURCE_PATTERN);
const familyPattern = /^[A-Za-z][A-Za-z0-9]*(?:[ -][A-Za-z0-9]+)*$/;
const weightPattern = /^(?:[1-9][0-9]{0,2}|1000)(?: (?:[1-9][0-9]{0,2}|1000))?$/;
const faceKeys = new Set(['family', 'src', 'weight', 'style']);

function weightRange(weight = '400'): readonly [number, number] {
    const [first, last] = weight.split(' ').map(Number);
    return [first, last ?? first];
}

function isFontFace(value: unknown): value is TDraftFontFaceConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const face = value as Record<string, unknown>;
    if (!Object.keys(face).every(key => faceKeys.has(key))) return false;
    if (typeof face['family'] !== 'string' || face['family'].length > 80
        || face['family'].trim() !== face['family'] || !familyPattern.test(face['family'])) return false;
    if (typeof face['src'] !== 'string' || face['src'].length > 2048 || !sourcePattern.test(face['src'])) return false;
    if (face['style'] !== undefined && face['style'] !== 'normal' && face['style'] !== 'italic') return false;
    if (face['weight'] !== undefined && (typeof face['weight'] !== 'string'
        || face['weight'].trim() !== face['weight'] || !weightPattern.test(face['weight']))) return false;
    const [min, max] = weightRange(face['weight'] as string | undefined);
    return min <= max;
}

export function isDraftFontFaces(value: unknown): value is readonly TDraftFontFaceConfig[] {
    if (!Array.isArray(value) || value.length > MAX_DRAFT_FONT_FACES || !value.every(isFontFace)) return false;
    // Two faces must not compete for the same family/style/weight in this active draft.
    return value.every((face, index) => value.slice(0, index).every(previous => {
        if (previous.family.toLowerCase() !== face.family.toLowerCase()
            || (previous.style ?? 'normal') !== (face.style ?? 'normal')) return true;
        const [min, max] = weightRange(face.weight);
        const [previousMin, previousMax] = weightRange(previous.weight);
        return max < previousMin || min > previousMax;
    }));
}
