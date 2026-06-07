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
    getCombos?: () => Record<string, unknown>;
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
            this.syncDraftCombosFromStore();
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

        this.syncDraftCombosFromStore();

        const normalized = this.normalizeClassEntries(classes)
            .filter((entry) => this.isAngoraManagedClass(entry))
            .filter((entry) => !this.replayedClasses.has(entry));

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

    waitForCssReady(timeoutMs = 1_500, requiredClasses: readonly string[] = []): Promise<boolean> {
        if (!this.isBrowser) return Promise.resolve(true);
        this.syncDraftCombosFromStore();

        const required = this.normalizeClassEntries(requiredClasses)
            .filter((entry) => this.isRegisteredComboClass(entry));

        if (required.length > 0) {
            return this.waitForRequiredCssRules(required, timeoutMs);
        }

        return this.ank.waitForCssReady?.(timeoutMs) ?? Promise.resolve(this.hasGeneratedCssRules());
    }

    containsRegisteredComboClass(classes: readonly string[]): boolean {
        if (!this.isBrowser) return false;
        this.syncDraftCombosFromStore();
        return this.normalizeClassEntries(classes)
            .some((entry) => this.isRegisteredComboClass(entry));
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

    private syncDraftCombosFromStore(): void {
        this.draftCombos = this.sanitizeCombos(this.store.combos()?.combos ?? {});
        this.refreshAppliedCombos();
    }

    private normalizeClassList(value: string): string {
        return normalizeAngoraClassList(
            value,
            this.ank.cssNamesParsed ?? {},
            String(this.ank.indicatorClass ?? 'ank'),
        );
    }

    private normalizeClassEntries(classes: readonly string[]): string[] {
        return Array.from(new Set(
            (classes ?? [])
                .flatMap((entry) => this.normalizeClassList(String(entry).trim()).split(/\s+/))
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0)
        ));
    }

    private async waitForRequiredCssRules(classes: readonly string[], timeoutMs: number): Promise<boolean> {
        this.updateClasses(classes);

        const timeoutAt = Date.now() + Math.max(0, timeoutMs);
        let fullScanRequested = false;

        while (Date.now() <= timeoutAt) {
            const missingClasses = this.missingCssRuleClasses(classes);
            if (missingClasses.length === 0) {
                return this.waitForNextPaint(true);
            }

            this.ank.cssCreate(missingClasses);

            if (!fullScanRequested && missingClasses.some((className) => this.isRegisteredComboClass(className))) {
                this.ank.cssCreate(undefined, true);
                fullScanRequested = true;
            }

            await this.waitForNextFrame();
        }

        return this.waitForNextPaint(false);
    }

    private missingCssRuleClasses(classes: readonly string[]): string[] {
        return Array.from(new Set(classes))
            .filter((className) => this.isAngoraManagedClass(className))
            .filter((className) => !this.hasCssRuleForClass(className));
    }

    private hasCssRuleForClass(className: string): boolean {
        if (typeof document === 'undefined') return false;

        const comboKey = this.findMatchingComboKey(className);
        if (comboKey) {
            return this.hasComboCssRule(comboKey);
        }

        const escapedClassName = this.escapeCssClass(className);
        const classSelectorPattern = new RegExp(`\\.${ this.escapeRegex(escapedClassName) }(?=[\\s,.#:>{~+\\[]|$)`);

        return Array.from(document.styleSheets ?? [])
            .some((sheet) => this.stylesheetHasClassRule(sheet, classSelectorPattern));
    }

    private hasComboCssRule(comboKey: string): boolean {
        const requiredMarkers = this.requiredComboRuleMarkers(comboKey);
        if (requiredMarkers.length > 0) {
            return requiredMarkers.every((marker) => Array.from(document.styleSheets ?? [])
                .some((sheet) => this.stylesheetHasText(sheet, marker)))
                && this.hasComputedComboColor(comboKey);
        }

        const comboRuleMarker = `__COM_${ comboKey }`;
        return Array.from(document.styleSheets ?? [])
            .some((sheet) => this.stylesheetHasText(sheet, comboRuleMarker));
    }

    private requiredComboRuleMarkers(comboKey: string): string[] {
        return this.requiredComboColorValues(comboKey)
            .map((value) => `__COM_${ comboKey }-${ value }`);
    }

    private requiredComboColorValues(comboKey: string): string[] {
        return Array.from(new Set(
            (this.appliedCombos[comboKey] ?? [])
                .flatMap((entry) => String(entry ?? '').split(/\s+/))
                .map((entry) => entry.trim())
                .filter((entry) => /(^|-)color-|(^|-)text-/.test(entry))
                .map((entry) => entry.split('-').pop())
                .filter((value): value is string => !!value)
        ));
    }

    private hasComputedComboColor(comboKey: string): boolean {
        const expectedColors = this.requiredComboColorValues(comboKey)
            .map((value) => this.resolveCssColorToken(value))
            .filter((value): value is string => !!value);

        if (expectedColors.length === 0) {
            return true;
        }

        const selector = `.${ this.escapeCssClass(comboKey) }`;
        const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
        if (elements.length === 0) {
            return false;
        }

        return elements.every((element) => expectedColors.includes(getComputedStyle(element).color));
    }

    private resolveCssColorToken(tokenName: string): string | null {
        if (!document.body) {
            return null;
        }

        const probe = document.createElement('span');
        probe.style.color = `var(--ank-${ tokenName })`;
        probe.style.position = 'absolute';
        probe.style.pointerEvents = 'none';
        probe.style.visibility = 'hidden';
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color || null;
    }

    private stylesheetHasClassRule(sheet: CSSStyleSheet, classSelectorPattern: RegExp): boolean {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            return false;
        }

        return Array.from(rules).some((rule) => this.cssRuleHasClass(rule, classSelectorPattern));
    }

    private stylesheetHasText(sheet: CSSStyleSheet, text: string): boolean {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            return false;
        }

        return Array.from(rules).some((rule) => this.cssRuleContainsText(rule, text));
    }

    private cssRuleHasClass(rule: CSSRule, classSelectorPattern: RegExp): boolean {
        const selectorText = (rule as CSSStyleRule).selectorText;
        if (selectorText && classSelectorPattern.test(selectorText)) {
            return true;
        }

        const nestedRules = (rule as CSSGroupingRule).cssRules;
        if (!nestedRules) {
            return false;
        }

        return Array.from(nestedRules).some((nestedRule) => this.cssRuleHasClass(nestedRule, classSelectorPattern));
    }

    private cssRuleContainsText(rule: CSSRule, text: string): boolean {
        if (rule.cssText?.includes(text)) {
            return true;
        }

        const nestedRules = (rule as CSSGroupingRule).cssRules;
        if (!nestedRules) {
            return false;
        }

        return Array.from(nestedRules).some((nestedRule) => this.cssRuleContainsText(nestedRule, text));
    }

    private waitForNextFrame(): Promise<void> {
        if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
            return new Promise((resolve) => globalThis.setTimeout(resolve, 16));
        }

        return new Promise((resolve) => {
            let settled = false;
            const fallback = globalThis.setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve();
            }, 50);

            window.requestAnimationFrame(() => {
                if (settled) return;
                settled = true;
                globalThis.clearTimeout(fallback);
                resolve();
            });
        });
    }

    private async waitForNextPaint<T>(value: T): Promise<T> {
        await this.waitForNextFrame();
        await this.waitForNextFrame();
        return value;
    }

    private escapeCssClass(className: string): string {
        if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
            return CSS.escape(className);
        }

        return className.replace(/[^a-zA-Z0-9_-]/g, (match) => `\\${ match }`);
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        const registeredCombos = this.ank.getCombos?.() ?? this.ank.combos ?? {};
        keys.forEach((key) => {
            if (!Object.prototype.hasOwnProperty.call(registeredCombos, key)) {
                return;
            }

            registeredCombos[key] = [];
        });
    }
}
