import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { TDraftFontFaceConfig } from '../types/config-payloads.types';
import { DraftFontService } from './draft-font.service';

const FONT: TDraftFontFaceConfig = {
    family: 'Editorial Serif', src: '/fonts/editorial.woff2', weight: '400 600', style: 'normal',
};

describe('DraftFontService', () => {
    let service: DraftFontService;
    let fontSet: Set<FontFace>;
    let requests: { face: FontFace; source: string; descriptors: FontFaceDescriptors; resolve: () => void; reject: () => void }[];
    let documentStub: { fonts?: Set<FontFace>; defaultView: { FontFace?: unknown } };

    beforeEach(() => {
        fontSet = new Set();
        requests = [];
        // Only the browser/network font API is replaced; the service owns real lifecycle and validation.
        class PendingFontFace {
            readonly status = 'loading';
            private readonly result: Promise<FontFace>;
            constructor(readonly family: string, source: string, readonly descriptors: FontFaceDescriptors) {
                this.result = new Promise<FontFace>((resolve, reject) => requests.push({
                    face: this as unknown as FontFace, source, descriptors,
                    resolve: () => resolve(this as unknown as FontFace),
                    reject: () => reject(new Error('Simulated font network failure')),
                }));
            }
            load(): Promise<FontFace> { return this.result; }
        }
        documentStub = { fonts: fontSet, defaultView: { FontFace: PendingFontFace } };
        TestBed.configureTestingModule({ providers: [
            { provide: DOCUMENT, useValue: documentStub },
            { provide: PLATFORM_ID, useValue: 'browser' },
        ] });
        service = TestBed.inject(DraftFontService);
    });

    afterEach(() => {
        service.clear();
        TestBed.resetTestingModule();
    });

    it('activates only decoded fonts and preserves the authored family, weight and style', async () => {
        const pending = service.activate('preview.example.test', [FONT]);
        expect(requests.length).toBe(1);
        expect(fontSet.size).toBe(0);
        if (!requests[0]) return;
        expect(requests[0].source).toBe('url("/fonts/editorial.woff2") format("woff2")');
        expect(requests[0].face.family).toBe('Editorial Serif');
        expect(requests[0].descriptors).toEqual({ weight: '400 600', style: 'normal', display: 'swap' });
        requests[0].resolve();
        await pending;
        expect(fontSet.has(requests[0].face)).toBeTrue();
    });

    it('does not recreate faces across repeated routes or language changes in the same draft', async () => {
        const first = service.activate('preview.example.test', [FONT]);
        const second = service.activate('preview.example.test', [{ ...FONT }]);
        expect(requests.length).toBe(1);
        if (!requests[0]) return;
        requests[0].resolve();
        await Promise.all([first, second]);
        await service.activate('preview.example.test', [FONT]);
        expect(requests.length).toBe(1);
        expect(fontSet.size).toBe(1);
    });

    it('removes only owned faces when a draft no longer declares fonts', async () => {
        const foreignFace = {} as FontFace;
        fontSet.add(foreignFace);
        const pending = service.activate('preview.example.test', [FONT]);
        expect(requests.length).toBe(1);
        if (!requests[0]) return;
        requests[0].resolve();
        await pending;
        expect(fontSet.size).toBe(2);
        await service.activate('other.example.test');
        expect([...fontSet]).toEqual([foreignFace]);
    });

    it('ignores late results from a previous draft and settles its pending activation', async () => {
        const first = service.activate('preview.example.test', [FONT]);
        const second = service.activate('other.example.test', [{ ...FONT, family: 'Other Serif' }]);
        expect(requests.length).toBe(2);
        if (requests.length !== 2) return;
        await first;
        requests[1].resolve();
        await second;
        requests[0].resolve();
        await Promise.resolve();
        expect([...fontSet]).toEqual([requests[1].face]);
    });

    it('falls back on a failed face without rejecting or blocking successful faces', async () => {
        const pending = service.activate('preview.example.test', [FONT, { ...FONT, family: 'Editorial Sans' }]);
        expect(requests.length).toBe(2);
        if (requests.length !== 2) return;
        requests[0].reject();
        requests[1].resolve();
        await expectAsync(pending).toBeResolved();
        expect([...fontSet]).toEqual([requests[1].face]);
    });

    it('bounds loading to 2500ms and never installs a font after timing out', async () => {
        jasmine.clock().install();
        try {
            const pending = service.activate('preview.example.test', [FONT]);
            expect(requests.length).toBe(1);
            if (!requests[0]) return;
            jasmine.clock().tick(2500);
            await pending;
            expect(fontSet.size).toBe(0);
            requests[0].resolve();
            await Promise.resolve();
            await Promise.resolve();
            expect(fontSet.size).toBe(0);
        } finally {
            jasmine.clock().uninstall();
        }
    });

    it('settles a cancelled load and does not install its late result after teardown', async () => {
        const pending = service.activate('preview.example.test', [FONT]);
        expect(requests.length).toBe(1);
        if (!requests[0]) return;
        service.clear();
        await pending;
        requests[0].resolve();
        await Promise.resolve();
        expect(fontSet.size).toBe(0);
    });

    it('performs no font work on the server or on browsers without the font API', async () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [
            { provide: DOCUMENT, useValue: documentStub },
            { provide: PLATFORM_ID, useValue: 'server' },
        ] });
        service = TestBed.inject(DraftFontService);
        await service.activate('preview.example.test', [FONT]);
        expect(requests.length).toBe(0);
        TestBed.resetTestingModule();
        documentStub.defaultView.FontFace = undefined;
        TestBed.configureTestingModule({ providers: [
            { provide: DOCUMENT, useValue: documentStub },
            { provide: PLATFORM_ID, useValue: 'browser' },
        ] });
        service = TestBed.inject(DraftFontService);
        await expectAsync(service.activate('preview.example.test', [FONT])).toBeResolved();
        expect(requests.length).toBe(0);
    });

    it('validates font descriptors again before any browser request', async () => {
        await service.activate('preview.example.test', [{ ...FONT, src: '//untrusted.test/font.woff2' }]);
        expect(requests.length).toBe(0);
        expect(fontSet.size).toBe(0);
    });
});
