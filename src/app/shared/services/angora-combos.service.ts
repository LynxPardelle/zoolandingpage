import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { inject, Injectable } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';

export type TAngoraCombosMap = Record<string, readonly string[]>;

@Injectable({ providedIn: 'root' })
export class AngoraCombosService {
    private readonly ank = inject(NgxAngoraService);
    private baseCombos: TAngoraCombosMap = {};

    setBaseCombos(combos: TAngoraCombosMap): void {
        this.baseCombos = this.sanitizeCombos(combos);
        this.ank.pushCombos(this.baseCombos);
    }

    applyPayload(payload?: TAngoraCombosPayload | null): void {
        const combos = payload?.combos ?? {};
        const sanitized = this.sanitizeCombos(combos);
        if (Object.keys(sanitized).length === 0) return;
        const merged = { ...this.baseCombos, ...sanitized };
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
}
