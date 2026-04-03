import {
    normalizeAngoraClassList,
    normalizeAngoraClassToken,
    normalizeClassBearingValueDeep,
} from './angora-class-normalization.utility';

describe('angora-class-normalization.utility', () => {
    const cssNamesParsed = {
        d: 'display',
        jc: 'justify-content',
        ai: 'align-items',
        fd: 'flex-direction',
        ta: 'text-align',
    };

    it('normalizes supported Angora longhand tokens to abbreviations', () => {
        expect(normalizeAngoraClassToken('ank-justifyContent-center', cssNamesParsed, 'ank')).toBe('ank-jc-center');
        expect(normalizeAngoraClassToken('ank-display-flex', cssNamesParsed, 'ank')).toBe('ank-d-flex');
        expect(normalizeAngoraClassToken('other-class', cssNamesParsed, 'ank')).toBe('other-class');
    });

    it('normalizes whitespace-delimited class lists', () => {
        expect(normalizeAngoraClassList('ank-display-flex ank-alignItems-center ctaButton', cssNamesParsed, 'ank'))
            .toBe('ank-d-flex ank-ai-center ctaButton');
    });

    it('normalizes nested class-bearing object properties without touching plain text', () => {
        const normalized = normalizeClassBearingValueDeep({
            classes: 'ank-flexDirection-column ank-textAlign-center',
            label: 'Keep me as-is',
            nested: {
                buttonClasses: 'ank-display-flex ank-justifyContent-center',
            },
        }, cssNamesParsed, 'ank');

        expect(normalized).toEqual({
            classes: 'ank-fd-column ank-ta-center',
            label: 'Keep me as-is',
            nested: {
                buttonClasses: 'ank-d-flex ank-jc-center',
            },
        });
    });
});
