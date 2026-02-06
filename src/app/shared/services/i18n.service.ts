import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { TLanguage } from '../i18n/i18n.types';
import { I18N_CONFIG } from '../i18n/index.i18n';
import { LanguageService } from './language.service';

type TDictionary = Record<string, unknown>;
type TInterpolationParams = Record<string, unknown>;
type TNamespaceTranslations = Record<string, TDictionary>; // lang -> dict
export type TI18nLoader = (lang: string, ctx: { signal?: AbortSignal }) => Promise<TDictionary>;

@Injectable({ providedIn: 'root' })
export class I18nService {
    private readonly _language = inject(LanguageService);

    private readonly dict = signal<TDictionary>({});
    private readonly cache = new Map<string, TDictionary>();
    private readonly namespaces = new Map<string, TNamespaceTranslations>();

    private loadSeq = 0;
    private inFlight?: AbortController;
    private loader: TI18nLoader = async (lang: string, ctx: { signal?: AbortSignal }): Promise<TDictionary> => {
        const I18N_CONFIGLang: TDictionary = I18N_CONFIG.translations[lang as TLanguage] as unknown as TDictionary;
        console.log(`Loading i18n for language "${ lang }" using default loader...`);
        console.log('Available languages in config:', Object.keys(I18N_CONFIG.translations));
        console.log('Requested language:', lang);
        console.log('I18N_CONFIG for requested language:', I18N_CONFIGLang);
        if (!I18N_CONFIGLang) throw new Error(`No i18n configuration found for language: ${ lang }`);
        return I18N_CONFIGLang;
    };

    readonly currentLang = computed(() => this._language.currentLanguage());
    readonly ready = computed(() => Object.keys(this.dict()).length > 0);

    constructor() {
        // Load dictionary when language changes
        effect(() => {
            const lang = this.currentLang();
            void this.reload(lang);
        });
    }

    /**
     * Provide a custom loader for translations (e.g., fetch from an API backed by a DB).
     * The loader should return the full dictionary for a language.
     */
    setLoader(loader: TI18nLoader, opts?: { clearCache?: boolean; reload?: boolean }): void {
        this.loader = loader;
        if (opts?.clearCache) this.clearCache();
        if (opts?.reload !== false) void this.reload();
    }

    /**
     * Convenience for DB/API-backed translations.
     * Example baseUrl: 'https://api.example.com/i18n' (expects GET `${baseUrl}/${lang}` returning JSON)
     */
    useApi(baseUrl: string, opts?: { headers?: Record<string, string> }): void {
        const base = String(baseUrl ?? '').trim().replace(/\/$/, '');
        if (!base) return;
        const headers = opts?.headers;

        this.setLoader(async (lang, ctx) => {
            const res = await fetch(`${ base }/${ encodeURIComponent(lang) }`, {
                cache: 'no-cache',
                signal: ctx.signal,
                headers,
            });
            if (!res.ok) throw new Error(`Failed to load i18n from API for ${ lang }`);
            return (await res.json()) as TDictionary;
        });
    }

    useI18nAssetsFile = async (lang: string, ctx: { signal?: AbortSignal }) => {
        const res = await fetch(`assets/i18n/${ lang }.json`, {
            cache: 'no-cache',
            signal: ctx.signal,
        });
        if (!res.ok) throw new Error(`Failed to load i18n for ${ lang }`);
        return (await res.json()) as TDictionary;
    };

    /**
     * Register a namespaced set of translations (per language).
     * Example: namespace='landing', translationsByLang={ en: {...}, es: {...} }
     */
    registerNamespace(namespace: string, translationsByLang: TNamespaceTranslations): void {
        const ns = String(namespace ?? '').trim();
        if (!ns) return;
        this.namespaces.set(ns, translationsByLang ?? {});
        this.applyNamespacesToCurrentDict();
    }

    unregisterNamespace(namespace: string): void {
        const ns = String(namespace ?? '').trim();
        if (!ns) return;
        if (!this.namespaces.has(ns)) return;
        this.namespaces.delete(ns);
        this.applyNamespacesToCurrentDict();
    }

    /**
     * Namespace helper: if you store a namespaced object at `dict[namespace]`,
     * this returns it strongly typed.
     */
    namespace<T = unknown>(namespace: string): T | undefined {
        return this.get<T>(namespace);
    }

    namespaceOr<T>(namespace: string, fallback: T | (() => T)): T {
        const v = this.namespace<T>(namespace);
        if (v != null) return v;
        return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
    }

    t(key: string, params?: TInterpolationParams): string {
        const value = this.getValue(key, this.dict());
        if (value === undefined) {
            console.log(`Translating key "${ key }" with params`, params, '->', value);
        }
        if (value == null) return key;
        if (typeof value === 'string') return this.interpolate(value, params);
        // Non-string values (arrays/objects) are returned JSON-stringified for simplicity
        try { return JSON.stringify(value); } catch { return String(value); }
    }

    tOr(key: string, fallback: string, params?: TInterpolationParams): string {
        const v = this.t(key, params);
        return v === key ? fallback : v;
    }

    get<T = unknown>(key: string): T | undefined {
        return this.getValue(key, this.dict()) as T | undefined;
    }

    getOr<T>(key: string, fallback: T): T {
        const v = this.get<T>(key);
        return v == null ? fallback : v;
    }

    /**
     * Hydrate translations for a language from an external source.
     * Useful when you already fetched translations elsewhere (API/SSR preload).
     */
    setTranslations(lang: string, dictionary: TDictionary, opts?: { cache?: boolean; applyIfCurrent?: boolean }): void {
        const l = String(lang ?? '').trim();
        if (!l) return;
        const dict = (dictionary ?? {}) as TDictionary;
        const cache = opts?.cache !== false;
        const apply = opts?.applyIfCurrent !== false;
        if (cache) this.cache.set(l, dict);
        if (apply && l === String(this.currentLang() ?? '').trim()) {
            this.dict.set(dict);
            this.applyNamespacesToCurrentDict();
        }
    }

    clearCache(lang?: string): void {
        const l = lang == null ? '' : String(lang).trim();
        if (!l) {
            this.cache.clear();
            return;
        }
        this.cache.delete(l);
    }

    /**
     * Reloads translations for the provided language (defaults to current).
     */
    async reload(lang?: string): Promise<void> {
        const l = String(lang ?? this.currentLang() ?? '').trim();
        if (!l) return;
        await this.load(l);
    }

    /**
     * Prefetch translations for a language without switching the current language.
     */
    async prefetch(lang: string): Promise<void> {
        const l = String(lang ?? '').trim();
        if (!l) return;
        if (this.cache.has(l)) return;
        if (typeof window === 'undefined') return;
        try {
            const json = await this.loader(l, {});
            this.cache.set(l, json);
        } catch {
            // ignore prefetch failures
        }
    }

    private async load(lang: string): Promise<void> {
        const runId = ++this.loadSeq;

        if (this.cache.has(lang)) {
            this.dict.set(this.cache.get(lang)!);
            this.applyNamespacesToCurrentDict();
            return;
        }

        try {
            this.inFlight?.abort();
            const controller = new AbortController();
            this.inFlight = controller;

            // SSR note:
            // - If you want SSR translations, call setLoader() with an SSR-safe loader,
            //   or call setTranslations() before render.
            // - Otherwise we behave like a no-op, but still apply registered namespaces.
            if (typeof window === 'undefined') {
                this.applyNamespacesToCurrentDict();
                return;
            }

            const json = await this.loader(lang, { signal: controller.signal });

            // Ignore stale responses if language changed quickly.
            if (runId !== this.loadSeq) return;

            this.cache.set(lang, json);
            this.dict.set(json);
            this.applyNamespacesToCurrentDict();
        } catch {
            if (runId !== this.loadSeq) return;
            this.dict.set({});
            this.applyNamespacesToCurrentDict();
        } finally {
            if (this.inFlight) this.inFlight = undefined;
        }
    }

    private applyNamespacesToCurrentDict(): void {
        const current = this.dict();
        if (this.namespaces.size === 0) return;

        const lang = String(this.currentLang() ?? '').trim();
        const merged: TDictionary = { ...current };

        for (const [ns, byLang] of this.namespaces.entries()) {
            const best = byLang?.[lang] ?? byLang?.['en'] ?? byLang?.['es'] ?? {};
            merged[ns] = best;
        }

        this.dict.set(merged);
    }

    private interpolate(str: string, params?: TInterpolationParams): string {
        if (!params) return str;
        return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (k in params ? String(params[k]) : ''));
    }

    private getValue(path: string, obj: TDictionary): unknown {
        const p = String(path ?? '').trim();
        if (!p) return undefined;
        return p
            .split('.')
            .reduce<unknown>((acc, part) => (
                acc &&
                    typeof acc === 'object' &&
                    part in (acc as any) ?
                    (acc as any)[part] :
                    undefined
            ), obj);
    }
}
