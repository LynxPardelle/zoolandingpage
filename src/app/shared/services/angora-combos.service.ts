import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';
import { ConfigStoreService } from './config-store.service';

export type TAngoraCombosMap = Record<string, readonly string[]>;

@Injectable({ providedIn: 'root' })
export class AngoraCombosService {
    private readonly ank = inject(NgxAngoraService);
    private readonly zone = inject(NgZone);
    private readonly store = inject(ConfigStoreService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private draftCombos: TAngoraCombosMap = {};
    private readonly auxiliaryCombos = new Map<string, TAngoraCombosMap>();
    private appliedCombos: TAngoraCombosMap = {};
    private lastAppliedSignature = '';
    private cssCreateTimer: number | null = null;
    private cssCreateDueAt: number | null = null;

    constructor() {
        effect(() => {
            this.draftCombos = this.sanitizeCombos(this.store.combos()?.combos ?? {});
            this.refreshAppliedCombos();
        });
    }

    setAuxiliaryCombos(scope: string, payload?: TAngoraCombosPayload | null): void {
        const key = String(scope ?? '').trim();
        if (!key) return;

        const sanitized = this.sanitizeCombos(payload?.combos ?? {});
        if (Object.keys(sanitized).length === 0) {
            this.auxiliaryCombos.delete(key);
        } else {
            this.auxiliaryCombos.set(key, sanitized);
        }

        this.refreshAppliedCombos();
    }

    clearAuxiliaryCombos(scope: string): void {
        const key = String(scope ?? '').trim();
        if (!key || !this.auxiliaryCombos.delete(key)) return;
        this.refreshAppliedCombos();
    }

    private refreshAppliedCombos(): void {
        const merged = this.mergeCombos();
        const signature = this.signatureFor(merged);
        if (signature === this.lastAppliedSignature) return;

        const removedKeys = Object.keys(this.appliedCombos)
            .filter((key) => !(key in merged));

        this.appliedCombos = merged;
        this.lastAppliedSignature = signature;

        if (!this.isBrowser) return;

        this.clearRemovedCombos(removedKeys);

        if (Object.keys(merged).length > 0) {
            this.ank.pushCombos(merged);
        }

        if (removedKeys.length > 0 || Object.keys(merged).length > 0) {
            this.scheduleCssCreate();
        }
    }

    scheduleCssCreate(delayMs = 0): void {
        if (!this.isBrowser) return;

        const normalizedDelay = Math.max(0, delayMs);
        const dueAt = Date.now() + normalizedDelay;

        if (this.cssCreateTimer !== null && this.cssCreateDueAt !== null && this.cssCreateDueAt <= dueAt) {
            return;
        }

        if (this.cssCreateTimer !== null) {
            window.clearTimeout(this.cssCreateTimer);
        }

        this.cssCreateDueAt = dueAt;
        this.zone.runOutsideAngular(() => {
            this.cssCreateTimer = window.setTimeout(() => {
                this.cssCreateTimer = null;
                this.cssCreateDueAt = null;
                this.ank.cssCreate();
            }, normalizedDelay);
        });
    }

    stopCssRuntime(): void {
        if (this.cssCreateTimer !== null) {
            window.clearTimeout(this.cssCreateTimer);
            this.cssCreateTimer = null;
        }
        this.cssCreateDueAt = null;
    }

    revealCssTimer(): void {
        if (!this.isBrowser || typeof document === 'undefined') return;

        try {
            const ankTimer = document.getElementById('ankTimer');
            if (ankTimer) {
                ankTimer.classList.remove('ank-d-none');
            }
        } catch {
            // no-op
        }
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

    private mergeCombos(): TAngoraCombosMap {
        const merged: Record<string, readonly string[]> = { ...this.draftCombos };

        this.auxiliaryCombos.forEach((combos) => {
            Object.assign(merged, combos);
        });

        return merged;
    }

    private clearRemovedCombos(keys: readonly string[]): void {
        keys.forEach((key) => {
            this.ank.updateCombo(key, []);
        });
    }
}
