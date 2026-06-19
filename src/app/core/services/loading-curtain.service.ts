import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { VariableStoreService } from '@/app/shared/services/variable-store.service';

type TLoadingCurtainConfig = {
    readonly enabled?: boolean;
    readonly title?: string;
    readonly subtitle?: string;
    readonly logoUrl?: string;
    readonly background?: string;
    readonly foreground?: string;
    readonly accent?: string;
    readonly minVisibleMs?: number;
    readonly exitDurationMs?: number;
};

declare global {
    interface Window {
        __ZLP_BOOT_CURTAIN_STARTED_AT__?: number;
    }
}

const DEFAULT_TITLE = 'Zoo Landing Page';
const DEFAULT_SUBTITLE = 'zoolandingpage.com.mx';
const DEFAULT_EXIT_DURATION_MS = 420;
const MAX_TIMING_MS = 5_000;
const CRITICAL_TEXT_COLOR_RETRY_MS = 50;
const CRITICAL_TEXT_COLOR_MAX_WAIT_MS = 2_500;

const CRITICAL_TEXT_COMBOS = [
    { className: 'sectionTitle', tokenName: 'titleColor' },
    { className: 'sectionSubtitle', tokenName: 'secondaryTitleColor' },
    { className: 'heroCaption', tokenName: 'secondaryTitleColor' },
] as const;

@Injectable({ providedIn: 'root' })
export class LoadingCurtainService {
    private readonly documentRef = inject(DOCUMENT);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly variables = inject(VariableStoreService);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private hideTimer: number | null = null;
    private currentConfig: TLoadingCurtainConfig = {};
    private criticalTextColorWaitStartedAt: number | null = null;

    configureFromDraft(): void {
        if (!this.isBrowser) return;

        const element = this.findCurtain();
        if (!element) return;

        const config = this.readConfig();
        this.currentConfig = config;

        if (config.enabled === false) {
            this.hideWhenReady('disabled');
            return;
        }

        element.hidden = false;
        element.setAttribute('aria-busy', 'true');
        element.classList.remove('zlp-boot-curtain--leaving');

        this.setText('[data-zlp-boot-title]', config.title || this.resolveTitle());
        this.setText('[data-zlp-boot-subtitle]', config.subtitle || DEFAULT_SUBTITLE);
        this.setLogo(config.logoUrl || this.resolveLogoUrl());
        this.setSafeCssVar(element, '--zlp-boot-bg', config.background);
        this.setSafeCssVar(element, '--zlp-boot-fg', config.foreground);
        this.setSafeCssVar(element, '--zlp-boot-accent', config.accent);
    }

    setStatus(status: { readonly title?: string; readonly subtitle?: string }): void {
        if (!this.isBrowser) return;

        const element = this.findCurtain();
        if (!element) return;

        element.hidden = false;
        element.setAttribute('aria-busy', 'true');
        element.removeAttribute('aria-hidden');
        element.classList.remove('zlp-boot-curtain--leaving');
        this.setText('[data-zlp-boot-title]', status.title || this.resolveTitle());
        this.setText('[data-zlp-boot-subtitle]', status.subtitle || DEFAULT_SUBTITLE);
    }

    hideWhenReady(_reason = 'ready'): void {
        if (!this.isBrowser) return;

        const element = this.findCurtain();
        if (!element || element.classList.contains('zlp-boot-curtain--leaving')) return;

        const minVisibleMs = this.clampMs(this.currentConfig.minVisibleMs, 0);
        const exitDurationMs = this.clampMs(this.currentConfig.exitDurationMs, DEFAULT_EXIT_DURATION_MS);
        const startedAt = window.__ZLP_BOOT_CURTAIN_STARTED_AT__ ?? 0;
        const elapsedMs = startedAt > 0 && typeof performance !== 'undefined'
            ? Math.max(0, performance.now() - startedAt)
            : minVisibleMs;
        const remainingMs = Math.max(0, minVisibleMs - elapsedMs);

        const beginExit = () => {
            if (!this.renderedCriticalTextColorsReady() && this.criticalTextColorWaitRemaining()) {
                this.clearHideTimer();
                this.hideTimer = window.setTimeout(beginExit, CRITICAL_TEXT_COLOR_RETRY_MS);
                return;
            }

            this.criticalTextColorWaitStartedAt = null;
            element.classList.add('zlp-boot-curtain--leaving');
            element.setAttribute('aria-busy', 'false');
            element.setAttribute('aria-hidden', 'true');

            this.clearHideTimer();
            this.hideTimer = window.setTimeout(() => {
                element.remove();
                this.clearHideTimer();
            }, exitDurationMs);
        };

        this.clearHideTimer();
        if (remainingMs === 0) {
            beginExit();
            return;
        }

        this.hideTimer = window.setTimeout(beginExit, remainingMs);
    }

    private findCurtain(): HTMLElement | null {
        return this.documentRef.getElementById('zlp-boot-curtain');
    }

    private readConfig(): TLoadingCurtainConfig {
        const config = this.variables.getRecord<TLoadingCurtainConfig>('ui.loadingCurtain') ?? {};
        return { ...config };
    }

    private resolveTitle(): string {
        return this.variables.getString('brand.displayName')
            || this.variables.getString('appIdentity.name')
            || DEFAULT_TITLE;
    }

    private resolveLogoUrl(): string {
        return this.variables.getString('brand.logoUrl')
            || this.variables.getString('heroAssets.logoUrl');
    }

    private setText(selector: string, value: string): void {
        const target = this.findCurtain()?.querySelector(selector);
        if (!target) return;
        target.textContent = value;
    }

    private setLogo(value: string): void {
        const logo = this.findCurtain()?.querySelector<HTMLImageElement>('[data-zlp-boot-logo]');
        if (!logo) return;

        const safeUrl = this.safeAssetUrl(value);
        if (!safeUrl) {
            logo.removeAttribute('src');
            logo.hidden = true;
            return;
        }

        logo.src = safeUrl;
        logo.hidden = false;
    }

    private safeAssetUrl(value: string): string {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) return '';

        if (trimmed.startsWith('//')) return '';
        if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

        try {
            const url = new URL(trimmed, window.location.origin);
            if (url.protocol === 'http:' || url.protocol === 'https:') {
                return url.toString();
            }
        } catch {
            return '';
        }

        return '';
    }

    private setSafeCssVar(element: HTMLElement, name: string, value: string | undefined): void {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) return;
        if (!this.isSafeCssValue(trimmed)) return;
        element.style.setProperty(name, trimmed);
    }

    private isSafeCssValue(value: string): boolean {
        return !/[;{}]/.test(value) && !/url\s*\(/i.test(value);
    }

    private clampMs(value: number | undefined, fallback: number): number {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return fallback;
        }

        return Math.min(MAX_TIMING_MS, Math.max(0, value));
    }

    private renderedCriticalTextColorsReady(): boolean {
        return CRITICAL_TEXT_COMBOS.every(({ className, tokenName }) => (
            this.renderedComboColorReady(className, tokenName)
        ));
    }

    private renderedComboColorReady(className: string, tokenName: string): boolean {
        const elements = Array.from(this.documentRef.querySelectorAll<HTMLElement>(`.${ className }`));
        if (elements.length === 0) {
            return true;
        }

        const expectedColor = this.resolveExpectedThemeColor(tokenName);
        if (!expectedColor) {
            return false;
        }

        return elements.every((element) => getComputedStyle(element).color === expectedColor);
    }

    private resolveExpectedThemeColor(tokenName: string): string | null {
        const theme = this.variables.theme();
        const mode = theme?.defaultMode === 'dark' ? 'dark' : 'light';
        const palette = theme?.palettes?.[mode] as Record<string, string> | undefined;
        const value = palette?.[tokenName];
        return this.resolveCssColorValue(value);
    }

    private resolveCssColorValue(value: string | undefined): string | null {
        if (!this.documentRef.body) {
            return null;
        }

        const trimmed = String(value ?? '').trim();
        if (!trimmed) {
            return null;
        }

        const probe = this.documentRef.createElement('span');
        probe.style.color = trimmed;
        probe.style.position = 'absolute';
        probe.style.pointerEvents = 'none';
        probe.style.visibility = 'hidden';
        this.documentRef.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color || null;
    }

    private criticalTextColorWaitRemaining(): boolean {
        if (typeof performance === 'undefined') {
            return true;
        }

        const startedAt = window.__ZLP_BOOT_CURTAIN_STARTED_AT__
            ?? this.criticalTextColorWaitStartedAt
            ?? performance.now();
        this.criticalTextColorWaitStartedAt = startedAt;
        return performance.now() - startedAt < CRITICAL_TEXT_COLOR_MAX_WAIT_MS;
    }

    private clearHideTimer(): void {
        if (this.hideTimer === null) return;
        window.clearTimeout(this.hideTimer);
        this.hideTimer = null;
    }
}
