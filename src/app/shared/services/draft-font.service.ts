import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import type { TDraftFontFaceConfig } from '../types/config-payloads.types';
import { isDraftFontFaces } from '../utility/fonts/draft-font-config';

const FONT_LOAD_TIMEOUT_MS = 2_500;

@Injectable({ providedIn: 'root' })
export class DraftFontService implements OnDestroy {
    private readonly documentRef = inject(DOCUMENT);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly ownedFaces = new Set<FontFace>();
    private generation = 0;
    private currentKey: string | null = null;
    private completion = Promise.resolve();
    private cancelLoad: (() => void) | null = null;

    /** Decode before rendering; slow/failed fonts keep the authored fallback stack. */
    activate(domain: string, fonts: readonly TDraftFontFaceConfig[] = []): Promise<void> {
        if (!this.isBrowser) return Promise.resolve();
        if (!isDraftFontFaces(fonts)) {
            this.clear();
            return Promise.resolve();
        }

        const faces = fonts.map(face => ({ ...face, weight: face.weight ?? '400', style: face.style ?? 'normal' }));
        const key = JSON.stringify([domain, faces]);
        if (key === this.currentKey) return this.completion;
        this.clear();
        this.currentKey = key;

        const FontFaceConstructor = this.documentRef.defaultView?.FontFace;
        const fontSet = this.documentRef.fonts;
        if (!faces.length || !FontFaceConstructor || !fontSet) return this.completion;

        const generation = this.generation;
        this.completion = new Promise<void>(resolve => {
            let accepting = true;
            let remaining = faces.length;
            const finish = () => {
                if (!accepting) return;
                accepting = false;
                clearTimeout(timer);
                if (generation === this.generation) this.cancelLoad = null;
                resolve();
            };
            const timer = setTimeout(finish, FONT_LOAD_TIMEOUT_MS);
            this.cancelLoad = finish;
            const settled = () => {
                remaining--;
                if (remaining === 0) finish();
            };

            for (const config of faces) {
                try {
                    const face = new FontFaceConstructor(config.family,
                        `url(${JSON.stringify(config.src)}) format("woff2")`,
                        { weight: config.weight, style: config.style, display: 'swap' });
                    void face.load().then(loadedFace => {
                        if (!accepting || generation !== this.generation) return;
                        fontSet.add(loadedFace);
                        this.ownedFaces.add(loadedFace);
                    }).catch(() => {
                        // A blocked/failed public asset must not prevent the draft from opening.
                    }).finally(settled);
                } catch {
                    settled();
                }
            }
        });
        return this.completion;
    }

    clear(): void {
        this.generation++;
        this.cancelLoad?.();
        this.cancelLoad = null;
        for (const face of this.ownedFaces) this.documentRef.fonts?.delete(face);
        this.ownedFaces.clear();
        this.currentKey = null;
        this.completion = Promise.resolve();
    }

    ngOnDestroy(): void {
        this.clear();
    }
}
