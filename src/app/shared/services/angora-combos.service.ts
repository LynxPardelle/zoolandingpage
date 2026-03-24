import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';

export type TAngoraCombosMap = Record<string, readonly string[]>;

@Injectable({ providedIn: 'root' })
export class AngoraCombosService {
    private readonly ank = inject(NgxAngoraService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private baseCombos: TAngoraCombosMap = {};
    private baseCombosInitialized = false;
    private lastAppliedSignature = '';
    private pendingPayload: TAngoraCombosPayload | null = null;

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
