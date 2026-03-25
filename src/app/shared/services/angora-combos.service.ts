import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';

export type TAngoraCombosMap = Record<string, readonly string[]>;

const DEFAULT_BASE_COMBOS: TAngoraCombosMap = {
    accContainer: [
        'ank-display-flex ank-flexDirection-column ank-gap-0_25rem',
    ],
    accItemContainer: [
        'ank-borderRadius-0_5rem',
    ],
    accItemExpandedContainer: [
        'ank-bg-accentColor',
    ],
    accItemNotExpandedContainer: [
        'ank-bg-secondaryBgColor',
    ],
    accItemButton: [
        'ank-outline-2px__solid__secondaryAccentColor ank-m-8px ank-color-textColor ank-borderRadius-0_25rem ank-border-0 ank-width-100per ank-textAlign-left ank-padding-0_75rem ank-fontWeight-600 ank-transition-all ank-bgHover-secondaryAccentColor ank-colorHover-titleColor ank-cursor-pointer ank-display-flex ank-justifyContent-spaceMINbetween ank-alignItems-center ank-w-calcSD100per__MIN__16pxED',
    ],
    accItemButtonIsExpanded: [
        'ank-bg-secondaryAccentColor',
    ],
    accItemButtonIsNotExpanded: [
        'ank-bg-transparent',
    ],
    accItemButtonIcon: [
        'ank-transition-transform ank-transformOrigin-center ank-fontSize-1_25rem ank-color-textColor',
    ],
    accItemButtonIconIsExpanded: [
        'ank-transform-rotateSD180degED',
    ],
    accItemButtonIconIsNotExpanded: [
        '',
    ],
    accItemPanel: [
        'ank-overflow-hidden ank-paddingInline-0_75rem ank-paddingBlock-0_5rem ank-color-textColor',
    ],
    btnBase: [
        'ank-px-VAL1DEF1_5remDEF',
        'ank-py-VAL2DEF0_75remDEF',
        'ank-borderRadius-VAL3DEF0_5remDEF',
        'ank-fontWeight-VAL4DEF550DEF',
        'ank-transformHover-translateYSDVAL5DEFMIN1pxDEFED',
        'ank-gap-VAL6DEF0_5remDEF',
        'ank-justifyContent-VAL7DEFcenterDEF',
        'ank-outlineColor-VAL8DEFtransparentDEF',
        'ank-fs-VAL9DEF1_5remDEF',
        'ank-d-flex',
        'ank-alignItems-center',
        'ank-textDecoration-none',
        'ank-transition-all__200ms',
        'ank-position-relative',
    ],
    btnTypePrimary: [
        'ank-bg-VAL1DEFbgColorDEF',
        'ank-color-VAL2DEFtextColorDEF',
        'ank-border-VAL3DEF2pxDEF__VAL4DEFsolidDEF__VAL1DEFnoneDEF',
    ],
    btnTypeOutline: [
        'ank-border-2px__solid__VAL1DEFbgColorDEF ank-color-VAL1DEFbgColorDEF ank-bgHover-VAL1DEFbgColorDEF',
        'ank-colorHover-VAL2DEFtextColorDEF',
        'ank-bg-transparent',
        'ank-border-VAL3DEF2pxDEF__VAL4DEFsolidDEF__VAL1DEFnoneDEF',
    ],
    btnTypeGhost: [
        'ank-color-VAL1DEFtextColorDEF',
        'ank-bg-transparent ank-opacity-80 ank-opacityHover-100',
    ],
    btnIcon: ['ank-w-1rem ank-h-1rem ank-me-1rem'],
    btnSpinner: [
        'ank-display-inlineBlock ank-width-1rem ank-height-1rem',
        'ank-border-2px ank-borderStyle-solid ank-borderColor-secondaryLinkColor',
        'ank-borderTopColor-transparent ank-borderRadius-99rem',
        'ank-and-1s',
        'ank-antf-linear',
        'ank-anic-infinite',
        'spinAnimation',
    ],
    cardHover: [
        'ank-transition-all ank-td-300ms ank-transformHover-translateYSDMIN4pxED ank-boxShadowHover-0__0_5rem__1rem__rgbaSD0COM0COM0COM0_5ED',
    ],
    sectionPadding: ['ank-py-80px ank-px-20px'],
    containerMax: ['ank-maxWidth-1200px ank-mx-auto'],
    gridCol2: [
        'ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-md-repeatSD2COM1frED ank-gridTemplateColumns-lg-repeatSD3COM1frED ank-gap-2rem',
    ],
    textGradient: [
        'ank-bgi-linearMINgradientSDVAL1DEF90degDEFCOMVAL2DEFsecondaryAccentColorDEFCOMVAL3DEFsecondaryTitleColorDEFED ank-bgcl-text ank-color-transparent',
    ],
};

@Injectable({ providedIn: 'root' })
export class AngoraCombosService {
    private readonly ank = inject(NgxAngoraService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private baseCombos: TAngoraCombosMap = {};
    private baseCombosInitialized = false;
    private baseCombosTimer: ReturnType<typeof setTimeout> | null = null;
    private lastAppliedSignature = '';
    private pendingPayload: TAngoraCombosPayload | null = null;

    initializeBaseCombos(delayMs = 0): void {
        if (this.baseCombosInitialized || this.baseCombosTimer) return;

        const applyBaseCombos = () => {
            this.baseCombosTimer = null;
            this.setBaseCombos(DEFAULT_BASE_COMBOS);
        };

        if (delayMs <= 0) {
            applyBaseCombos();
            return;
        }

        this.baseCombosTimer = setTimeout(() => applyBaseCombos(), delayMs);
    }

    setBaseCombos(combos: TAngoraCombosMap): void {
        this.baseCombos = this.sanitizeCombos(combos);
        this.baseCombosInitialized = true;
        if (!this.isBrowser) return;
        this.lastAppliedSignature = this.signatureFor(this.baseCombos);
        this.ank.pushCombos(this.baseCombos);

        if (this.pendingPayload) {
            const payload = this.pendingPayload;
            this.pendingPayload = null;
            this.applyPayload(payload);
        }
    }

    applyPayload(payload?: TAngoraCombosPayload | null): void {
        if (!this.baseCombosInitialized) {
            this.pendingPayload = payload ?? null;
            return;
        }

        const combos = payload?.combos ?? {};
        const sanitized = this.sanitizeCombos(combos);
        if (Object.keys(sanitized).length === 0) return;
        const merged = { ...this.baseCombos, ...sanitized };
        if (!this.isBrowser) return;
        const signature = this.signatureFor(merged);
        if (signature === this.lastAppliedSignature) return;
        this.lastAppliedSignature = signature;
        this.ank.pushCombos(merged);
    }

    private sanitizeCombos(combos: TAngoraCombosMap): TAngoraCombosMap {
        const cleaned: Record<string, string[]> = {};
        Object.entries(combos ?? {}).forEach(([key, value]) => {
            if (!key || !Array.isArray(value)) return;
            const list = value
                .map((entry) => String(entry).trim())
                .filter((entry) => entry.length > 0);
            if (list.length > 0) cleaned[key] = list;
        });
        return cleaned;
    }

    private signatureFor(combos: TAngoraCombosMap): string {
        return Object.keys(combos)
            .sort((left, right) => left.localeCompare(right))
            .map((key) => `${ key }=${ combos[key].join('|') }`)
            .join('||');
    }
}
