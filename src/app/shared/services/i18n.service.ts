import { DEFAULT_FRAMEWORK_TRANSLATIONS } from '@/app/shared/i18n/default-framework-translations';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, computed, effect, inject, signal } from '@angular/core';
import { LanguageService } from './language.service';
import { RuntimeConfigService } from './runtime-config.service';

type TDictionary = Record<string, unknown>;
type TInterpolationParams = Record<string, unknown>;
type TNamespaceTranslations = Record<string, TDictionary>; // lang -> dict
export type TI18nLoader = (lang: string, ctx: { signal?: AbortSignal }) => Promise<TDictionary>;

@Injectable({ providedIn: 'root' })
export class I18nService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly request = inject(REQUEST, { optional: true });
    private readonly _language = inject(LanguageService);
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;

    private readonly baseDict = signal<TDictionary>(this.withFrameworkFallback(this._language.currentLanguage(), {}));
    private readonly autoLoadEnabled = signal(false);
    private readonly cache = new Map<string, TDictionary>();
    private readonly namespaces = signal(new Map<string, TNamespaceTranslations>());
    private readonly missingKeysLogged = new Set<string>();

    private loadSeq = 0;
    private inFlight?: AbortController;
    private loader: TI18nLoader = async (_lang: string, _ctx: { signal?: AbortSignal }): Promise<TDictionary> => {
        return {};
    };

    readonly currentLang = computed(() => this._language.currentLanguage());
    private readonly dict = computed(() => this.applyNamespacesToDictionary(
        this.baseDict(),
        String(this.currentLang() ?? '').trim()
    ));
    readonly ready = computed(() => Object.keys(this.dict()).length > 0);

    constructor() {
        // Load dictionary when language changes
        effect(() => {
            if (!this.autoLoadEnabled()) {
                return;
            }

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
        if (opts?.reload !== false) {
            this.autoLoadEnabled.set(true);
            void this.reload();
        }
    }

    enableAutoLoad(): void {
        this.autoLoadEnabled.set(true);
    }

    disableAutoLoad(): void {
        this.autoLoadEnabled.set(false);
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
        const next = new Map(this.namespaces());
        next.set(ns, translationsByLang ?? {});
        this.namespaces.set(next);
    }

    unregisterNamespace(namespace: string): void {
        const ns = String(namespace ?? '').trim();
        if (!ns) return;
        const current = this.namespaces();
        if (!current.has(ns)) return;
        const next = new Map(current);
        next.delete(ns);
        this.namespaces.set(next);
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
        if (value === undefined && this.runtimeConfig.isDebugMode() && this.isBrowser) {
            const cacheKey = `${ this.currentLang() }::${ key }`;
            if (!this.missingKeysLogged.has(cacheKey)) {
                this.missingKeysLogged.add(cacheKey);
                console.warn(`[I18n] Missing translation for key "${ key }" in language "${ this.currentLang() }".`, params);
            }
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
        const dict = this.withFrameworkFallback(l, (dictionary ?? {}) as TDictionary);
        const cache = opts?.cache !== false;
        const apply = opts?.applyIfCurrent !== false;
        if (cache) this.cache.set(l, dict);
        if (apply && l === String(this.currentLang() ?? '').trim()) {
            this.baseDict.set(dict);
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
        if (!this.isBrowser) return;
        try {
            const json = await this.loader(l, {});
            this.cache.set(l, this.withFrameworkFallback(l, json));
        } catch {
            // ignore prefetch failures
        }
    }

    private async load(lang: string): Promise<void> {
        const runId = ++this.loadSeq;
        this.baseDict.set(this.withFrameworkFallback(lang, {}));

        if (this.cache.has(lang)) {
            this.baseDict.set(this.cache.get(lang)!);
            return;
        }

        try {
            this.inFlight?.abort();
            const controller = new AbortController();
            this.inFlight = controller;

            // SSR note:
            // - If you want SSR translations, call setLoader() with an SSR-safe loader,
            //   or call setTranslations() before render.
            // - Otherwise we behave like a no-op, while computed namespaces remain available.
            if (!this.isBrowser) {
                return;
            }

            const json = await this.loader(lang, { signal: controller.signal });
            const merged = this.withFrameworkFallback(lang, json);

            // Ignore stale responses if language changed quickly.
            if (runId !== this.loadSeq) return;

            this.cache.set(lang, merged);
            this.baseDict.set(merged);
        } catch {
            if (runId !== this.loadSeq) return;
            this.baseDict.set(this.withFrameworkFallback(lang, {}));
        } finally {
            if (this.inFlight) this.inFlight = undefined;
        }
    }

    private applyNamespacesToDictionary(current: TDictionary, lang: string): TDictionary {
        const namespaces = this.namespaces();
        if (namespaces.size === 0) return current;

        const merged: TDictionary = { ...current };

        for (const [ns, byLang] of namespaces.entries()) {
            const best = byLang?.[lang] ?? byLang?.['en'] ?? byLang?.['es'] ?? {};
            merged[ns] = best;
        }

        return merged;
    }

    private withFrameworkFallback(lang: string, dictionary: TDictionary): TDictionary {
        const fallback = this.frameworkFallbackFor(lang);
        return this.mergeDictionaries(fallback, dictionary);
    }

    private frameworkFallbackFor(lang: string): TDictionary {
        const normalized = String(lang ?? '').trim().toLowerCase();
        return (DEFAULT_FRAMEWORK_TRANSLATIONS[normalized] ?? DEFAULT_FRAMEWORK_TRANSLATIONS[normalized.split('-')[0]] ?? DEFAULT_FRAMEWORK_TRANSLATIONS['en'] ?? {}) as TDictionary;
    }

    private mergeDictionaries(base: TDictionary, override: TDictionary): TDictionary {
        const result: TDictionary = { ...base };

        Object.entries(override ?? {}).forEach(([key, value]) => {
            const current = result[key];
            if (this.isPlainRecord(current) && this.isPlainRecord(value)) {
                result[key] = this.mergeDictionaries(current as TDictionary, value as TDictionary);
                return;
            }

            result[key] = value;
        });

        return result;
    }

    private isPlainRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
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
