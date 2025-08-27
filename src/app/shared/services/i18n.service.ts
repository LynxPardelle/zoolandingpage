import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

type Dictionary = Record<string, any>;

@Injectable({ providedIn: 'root' })
export class I18nService {
    private readonly language = inject(LanguageService);
    private readonly dict = signal<Dictionary>({});
    private readonly cache = new Map<string, Dictionary>();

    readonly currentLang = computed(() => this.language.currentLanguage());
    readonly ready = computed(() => Object.keys(this.dict()).length > 0);

    constructor() {
        // Load dictionary when language changes
        effect(() => {
            const lang = this.currentLang();
            this.load(lang);
        });
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
            return;
        }
        if (typeof window === 'undefined') return; // SSR no-op
        try {
            const res = await fetch(`assets/i18n/${ lang }.json`, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`Failed to load i18n for ${ lang }`);
            const json = (await res.json()) as Dictionary;
            this.cache.set(lang, json);
            this.dict.set(json);
        } catch {
            this.dict.set({});
        }
    }

    private interpolate(str: string, params?: Record<string, any>): string {
        if (!params) return str;
        return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (k in params ? String(params[k]) : ''));
    }

    private getValue(path: string, obj: Dictionary): any {
        return path.split('.').reduce<any>((acc, part) => (acc && part in acc ? acc[part] : undefined), obj);
    }
}
