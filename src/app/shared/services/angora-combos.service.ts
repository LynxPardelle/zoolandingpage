import type { TAngoraCombosPayload } from '@/app/shared/types/config-payloads.types';
import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { NgxAngoraService } from 'ngx-angora-css';
import { normalizeAngoraClassList } from '../utility/angora-class-normalization.utility';
import { ConfigStoreService } from './config-store.service';

export type TAngoraCombosMap = Record<string, readonly string[]>;

type TAngoraRuntimeDebugBridge = {
    appliedCombos: () => TAngoraCombosMap;
    comboKeys: () => string[];
    replayedClasses: () => string[];
    isClassManaged: (className: string) => boolean;
    isComboClass: (className: string) => boolean;
    classifyClass: (className: string) => unknown;
    stylesheetAudit: (sampleLimit?: number) => unknown;
    cssCreateHistory: (limit?: number) => unknown;
    cssCreateSummary: () => unknown;
    cssCreateSnapshot: (historyLimit?: number) => unknown;
    clearCssCreateHistory: () => void;
    runFullCssCreate: () => unknown;
    updateRenderedClasses: (classes?: readonly string[]) => void;
};

declare global {
    interface Window {
        __zlpAngoraDebug?: TAngoraRuntimeDebugBridge;
    }
}

type TAngoraClassClassification = {
    kind?: string;
    managed?: boolean;
    comboKey?: string;
    prefix?: string;
};

type TAngoraCssCreateSummary = {
    totalCreatedClasses?: number;
    totalRules?: number;
};

type TAngoraStylesheetAudit = {
    totalRules?: number;
};

type TDebuggableAngoraService = NgxAngoraService & {
    isComboClass?: (className: string) => boolean;
    classifyClass?: (className: string) => TAngoraClassClassification;
    auditManagedStylesheets?: (sampleLimit?: number) => TAngoraStylesheetAudit;
    getCssCreateDebugSummary?: () => TAngoraCssCreateSummary;
    collectRenderedDomClasses?: (root?: ParentNode) => string[];
    hasGeneratedCssRules?: () => boolean;
    waitForCssReady?: (timeoutMs?: number) => Promise<boolean>;
};

@Injectable({ providedIn: 'root' })
export class AngoraCombosService {
    private readonly ank = inject(NgxAngoraService) as TDebuggableAngoraService;
    private readonly zone = inject(NgZone);
    private readonly store = inject(ConfigStoreService);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private draftCombos: TAngoraCombosMap = {};
    private readonly auxiliaryCombos = new Map<string, TAngoraCombosMap>();
    private appliedCombos: TAngoraCombosMap = {};
    private lastAppliedSignature = '';
    private readonly replayedClasses = new Set<string>();
    private cssCreateTimer: number | null = null;
    private cssCreateDueAt: number | null = null;

    constructor() {
        this.installDebugBridge();

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

        if (removedKeys.length > 0 || Object.keys(merged).length > 0) {
            this.ank.runInCssCreateBatch(() => {
                this.clearRemovedCombos(removedKeys);

                if (Object.keys(merged).length > 0) {
                    this.ank.pushCombos(merged);
                }
            });
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

    private findMatchingComboKey(className: string): string | undefined {
        let matchedKey: string | undefined;

        Object.keys(this.appliedCombos).forEach((key) => {
            if (className !== key && !className.startsWith(`${ key }VAL`)) {
                return;
            }

            if (!matchedKey || key.length > matchedKey.length) {
                matchedKey = key;
            }
        });

        return matchedKey;
    }

    private isRegisteredComboClass(className: string): boolean {
        return !!this.ank.isComboClass?.(className) || !!this.findMatchingComboKey(className);
    }

    private isAngoraManagedClass(className: string): boolean {
        const classification = this.ank.classifyClass?.(className);
        const indicatorClass = String(this.ank.indicatorClass ?? '').trim();
        const abbreviationKeys = Object.keys(this.ank.abreviationsClasses ?? {});
        const prefix = className.split('-')[0] ?? '';
        const hasPropertySegment = className.includes('-');

        if (!className) {
            return false;
        }

        if (classification?.managed) {
            return true;
        }

        if (this.isRegisteredComboClass(className)) {
            return true;
        }

        if (!hasPropertySegment) {
            return false;
        }

        return Boolean(
            className && (
                (indicatorClass && className.startsWith(`${ indicatorClass }-`))
                || abbreviationKeys.includes(prefix)
            )
        );
    }

    updateClasses(classes: readonly string[]): void {
        if (!this.isBrowser) return;

        const normalized = Array.from(new Set(
            (classes ?? [])
                .map((entry) => this.normalizeClassList(String(entry).trim()))
                .filter((entry) => entry.length > 0)
                .filter((entry) => this.isAngoraManagedClass(entry))
                .filter((entry) => !this.replayedClasses.has(entry))
        ));

        if (normalized.length === 0) {
            return;
        }

        this.zone.runOutsideAngular(() => {
            this.ank.cssCreate(normalized);
        });
        normalized.forEach((className) => this.replayedClasses.add(className));
    }

    collectRenderedDomClasses(root?: ParentNode): string[] {
        if (!this.isBrowser) return [];
        return this.ank.collectRenderedDomClasses?.(root) ?? [];
    }

    updateRenderedDomClasses(root?: ParentNode): void {
        this.updateClasses(this.collectRenderedDomClasses(root));
    }

    hasGeneratedCssRules(): boolean {
        if (!this.isBrowser) return false;
        return this.ank.hasGeneratedCssRules?.() ?? false;
    }

    waitForCssReady(timeoutMs = 1_500): Promise<boolean> {
        if (!this.isBrowser) return Promise.resolve(true);
        return this.ank.waitForCssReady?.(timeoutMs) ?? Promise.resolve(this.hasGeneratedCssRules());
    }

    stopCssRuntime(): void {
        if (this.cssCreateTimer !== null) {
            window.clearTimeout(this.cssCreateTimer);
            this.cssCreateTimer = null;
        }
        this.cssCreateDueAt = null;
        this.replayedClasses.clear();
    }

    private installDebugBridge(): void {
        if (!this.isBrowser || typeof window === 'undefined') return;

        const hostname = window.location.hostname;
        const localHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';

        if (!localHost) {
            return;
        }

        window.__zlpAngoraDebug = {
            appliedCombos: () => ({ ...this.appliedCombos }),
            comboKeys: () => Object.keys(this.appliedCombos),
            replayedClasses: () => Array.from(this.replayedClasses),
            isClassManaged: (className: string) => this.isAngoraManagedClass(String(className ?? '').trim()),
            isComboClass: (className: string) => this.isRegisteredComboClass(String(className ?? '').trim()),
            classifyClass: (className: string) => this.ank.classifyClass?.(String(className ?? '').trim()) ?? null,
            stylesheetAudit: (sampleLimit?: number) => this.ank.auditManagedStylesheets?.(sampleLimit) ?? null,
            cssCreateHistory: (limit?: number) => this.ank.getCssCreateHistory?.(limit),
            cssCreateSummary: () => this.ank.getCssCreateDebugSummary?.(),
            cssCreateSnapshot: (historyLimit?: number) => this.ank.getCssCreateDebugSnapshot?.(historyLimit),
            clearCssCreateHistory: () => this.ank.clearCssCreateHistory?.(),
            runFullCssCreate: () => this.ank.cssCreate(),
            updateRenderedClasses: (classes?: readonly string[]) => {
                if (!Array.isArray(classes)) {
                    return this.ank.cssCreate();
                }

                return this.updateClasses(classes);
            },
        };
    }

    private sanitizeCombos(combos: TAngoraCombosMap): TAngoraCombosMap {
        const cleaned: Record<string, string[]> = {};
        Object.entries(combos ?? {}).forEach(([key, value]) => {
            if (!key || !Array.isArray(value)) return;
            const list = value
                .map((entry) => this.normalizeClassList(String(entry).trim()))
                .filter((entry) => entry.length > 0);
            if (list.length > 0) cleaned[key] = list;
        });
        return cleaned;
    }

    private normalizeClassList(value: string): string {
        return normalizeAngoraClassList(
            value,
            this.ank.cssNamesParsed ?? {},
            String(this.ank.indicatorClass ?? 'ank'),
        );
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
