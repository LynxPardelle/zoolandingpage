import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { LanguageService } from './language.service';

type Dictionary = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class I18nService {
    private readonly language = inject(LanguageService);
    private readonly dict = signal<Dictionary>({});
    private readonly cache = new Map<string, Dictionary>();
    private readonly namespaces = new Map<string, Record<string, Dictionary>>();

    readonly currentLang = computed(() => this.language.currentLanguage());
    readonly ready = computed(() => Object.keys(this.dict()).length > 0);

    constructor() {
        // Load dictionary when language changes
        effect(() => {
            const lang = this.currentLang();
            this.load(lang);
        });
    }

    /**
     * Register a namespaced set of translations (per language).
     * Example: namespace='landing', translationsByLang={ en: {...}, es: {...} }
     */
    registerNamespace(namespace: string, translationsByLang: Record<string, Dictionary>): void {
        const ns = String(namespace ?? '').trim();
        if (!ns) return;
        this.namespaces.set(ns, translationsByLang);
        this.applyNamespacesToCurrentDict();
    }

    t(key: string, params?: Record<string, any>): string {
        const value = this.getValue(key, this.dict());
        if (value == null) return key;
        if (typeof value === 'string') return this.interpolate(value, params);
        // Non-string values (arrays/objects) are returned JSON-stringified for simplicity
        try { return JSON.stringify(value); } catch { return String(value); }
    }

    get<T = unknown>(key: string): T | undefined {
        return this.getValue(key, this.dict()) as T | undefined;
    }

    private async load(lang: string): Promise<void> {
        if (this.cache.has(lang)) {
            this.dict.set(this.cache.get(lang)!);
            this.applyNamespacesToCurrentDict();
            return;
        }
        if (typeof window === 'undefined') {
            // SSR no-op: still expose registered namespaces so UI can render.
            this.applyNamespacesToCurrentDict();
            return;
        }
        try {
            const res = await fetch(`assets/i18n/${ lang }.json`, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`Failed to load i18n for ${ lang }`);
            const json = (await res.json()) as Dictionary;
            this.cache.set(lang, json);
            this.dict.set(json);
            this.applyNamespacesToCurrentDict();
        } catch {
            this.dict.set({});
            this.applyNamespacesToCurrentDict();
        }
    }

    private applyNamespacesToCurrentDict(): void {
        if (this.namespaces.size === 0) return;
        const lang = String(this.currentLang() ?? '').trim();
        const current = this.dict();
        const merged: Dictionary = { ...current };

        for (const [ns, byLang] of this.namespaces.entries()) {
            const best = byLang[lang] ?? byLang['en'] ?? byLang['es'] ?? {};
            merged[ns] = best;
        }

        this.dict.set(merged);
    }

    private interpolate(str: string, params?: Record<string, any>): string {
        if (!params) return str;
        return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in params ? String(params[k]) : ''));
    }

    private getValue(path: string, obj: Dictionary): any {
        return path.split('.').reduce<any>((acc, part) => (acc && part in acc ? acc[part] : undefined), obj);
    }
}
