import type { TSeoPayload } from '@/app/shared/types/config-payloads.types';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable, REQUEST } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { normalizeLocaleCode, resolveLocaleMapValue, toOpenGraphLocale } from '../i18n/locale.utils';
import { resolveMetadataTemplates } from '../utility/metadata-template.utility';
import { DomainResolverService } from './domain-resolver.service';
import { RuntimeConfigService } from './runtime-config.service';
import { VariableStoreService } from './variable-store.service';

const AD_CANONICAL_QUERY_PARAMS = new Set([
    'gclid',
    'gbraid',
    'wbraid',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
]);
const SENSITIVE_CANONICAL_QUERY_PARAM_PATTERN = /(email|mail|phone|telefono|tel[eé]fono|whatsapp|address|direcci[oó]n|rfc|curp)/i;

@Injectable({ providedIn: 'root' })
export class SeoMetadataService {
    private readonly doc = inject(DOCUMENT);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly runtimeConfig = inject(RuntimeConfigService);
    private readonly variables = inject(VariableStoreService);
    private readonly request = inject(REQUEST, { optional: true });

    apply(lang: string, seo: TSeoPayload | null): void {
        try {
            const doc = this.doc;
            const root = doc?.documentElement;
            if (!doc || !root) {
                return;
            }

            root.setAttribute('lang', lang);
            root.setAttribute('dir', 'ltr');

            const draftTitle = this.resolveLocalizedText(seo?.title, lang);
            const draftDescription = this.resolveLocalizedText(seo?.description, lang);
            const siteSeo = this.runtimeConfig.seoDefaults();
            const fallbackSiteName = this.cleanString(siteSeo?.siteName) || this.resolveFallbackSiteName();
            const fallbackDescription = this.cleanString(siteSeo?.description) || this.runtimeConfig.appDescription();
            const seoTitle = draftTitle || this.cleanString(siteSeo?.title) || fallbackSiteName;
            const seoDescription = draftDescription || fallbackDescription || '';
            const seoKeywords = this.resolveMetaList(seo?.keywords, lang) || this.resolveMetaList(siteSeo?.keywords, lang);
            const seoRobots = this.resolveLocalizedText(seo?.robots, lang) || this.resolveLocalizedText(siteSeo?.robots, lang);

            this.title.setTitle(seoTitle);
            this.meta.updateTag({ name: 'description', content: seoDescription });
            this.syncNamedMetaTag('keywords', seoKeywords);
            this.syncNamedMetaTag('robots', seoRobots);

            const origin = this.cleanString(siteSeo?.canonicalOrigin)
                || this.cleanString(doc.defaultView?.location?.origin)
                || this.defaultOrigin();
            const pathname = this.normalizePathname(doc.defaultView?.location?.pathname);
            const search = this.cleanString(doc.defaultView?.location?.search);
            const url = `${ origin }${ pathname }${ search }`;
            const canonicalUrl = this.resolveEffectiveCanonicalUrl(
                this.resolveLocalizedText(seo?.canonical, lang) || url,
                origin,
                siteSeo,
            );
            const ogLocale = toOpenGraphLocale(lang) || 'en_US';
            const openGraphDefaults = this.resolveLocalizedRecord(this.asRecord(siteSeo?.openGraph), lang);
            const twitterDefaults = this.resolveLocalizedRecord(this.asRecord(siteSeo?.twitter), lang);
            const openGraph = this.resolveLocalizedRecord({
                ...openGraphDefaults,
                ...this.asRecord(seo?.openGraph),
            }, lang);
            const twitter = this.resolveLocalizedRecord({
                ...twitterDefaults,
                ...this.asRecord(seo?.twitter),
            }, lang);
            const openGraphUrl = this.cleanString(openGraph['url']) || canonicalUrl;
            const defaultImage = this.cleanString(siteSeo?.defaultImage)
                || this.cleanString(openGraphDefaults['image'])
                || this.cleanString(twitterDefaults['image'])
                || `${ origin }/assets/og-1200x630.svg`;
            const ogTitle = this.cleanString(openGraph['title']) || seoTitle;
            const ogDescription = this.cleanString(openGraph['description']) || seoDescription;
            const ogType = this.cleanString(openGraph['type']) || 'website';
            const ogImage = this.cleanString(openGraph['image']) || defaultImage;
            const ogSiteName = this.cleanString(openGraph['site_name']) || fallbackSiteName;
            const twitterCard = this.cleanString(twitter['card']) || 'summary_large_image';
            const twitterTitle = this.cleanString(twitter['title']) || seoTitle;
            const twitterDescription = this.cleanString(twitter['description']) || seoDescription;
            const twitterImage = this.cleanString(twitter['image']) || defaultImage;

            this.meta.updateTag({ property: 'og:title', content: ogTitle });
            this.meta.updateTag({ property: 'og:description', content: ogDescription });
            this.meta.updateTag({ property: 'og:type', content: ogType });
            this.meta.updateTag({ property: 'og:url', content: openGraphUrl });
            this.meta.updateTag({ property: 'og:image', content: ogImage });
            this.meta.updateTag({ property: 'og:locale', content: this.cleanString(openGraph['locale']) || ogLocale });
            this.meta.updateTag({ property: 'og:site_name', content: ogSiteName });

            this.meta.updateTag({ name: 'twitter:card', content: twitterCard });
            this.meta.updateTag({ name: 'twitter:title', content: twitterTitle });
            this.meta.updateTag({ name: 'twitter:description', content: twitterDescription });
            this.meta.updateTag({ name: 'twitter:image', content: twitterImage });

            const head = doc.head;
            if (head) {
                let linkEl = head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
                if (!linkEl) {
                    linkEl = doc.createElement('link');
                    linkEl.setAttribute('rel', 'canonical');
                    head.appendChild(linkEl);
                }
                linkEl.setAttribute('href', canonicalUrl);
                this.syncHreflangLinks(head, canonicalUrl, lang);
            }
        } catch {
            // no-op for SSR
        }
    }

    private resolveLocalizedRecord(record: Record<string, unknown>, lang: string): Record<string, unknown> {
        const resolved: Record<string, unknown> = {};

        Object.entries(record).forEach(([key, value]) => {
            resolved[key] = this.resolveLocalizedValue(value, lang);
        });

        return resolved;
    }

    private resolveLocalizedValue(value: unknown, lang: string): unknown {
        if (Array.isArray(value)) {
            return value.map((entry) => this.resolveLocalizedValue(entry, lang));
        }

        if (this.isLocaleMapRecord(value)) {
            const resolved = resolveLocaleMapValue(value, lang);
            return this.resolveMetadataValue(typeof resolved === 'string' ? resolved.trim() : resolved);
        }

        if (this.isRecord(value)) {
            return this.resolveLocalizedRecord(value, lang);
        }

        return this.resolveMetadataValue(value);
    }

    private resolveLocalizedText(value: unknown, lang: string): string {
        if (typeof value === 'string') {
            return this.cleanString(this.resolveMetadataValue(value));
        }

        if (this.isLocaleMapRecord(value)) {
            const resolved = resolveLocaleMapValue(value, lang);
            return this.cleanString(this.resolveMetadataValue(resolved));
        }

        return '';
    }

    private resolveMetadataValue(value: unknown): unknown {
        return resolveMetadataTemplates(value, {
            getVariable: (path) => this.variables.get(path),
            getQueryParam: (key) => this.readQueryParam(key),
        });
    }

    private resolveMetaList(value: unknown, lang: string): string {
        return this.serializeMetaContent(this.resolveLocalizedValue(value, lang));
    }

    private serializeMetaContent(value: unknown): string {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .join(', ');
        }

        if (Array.isArray(value)) {
            return value
                .flatMap((entry) => this.collectMetaEntries(entry))
                .join(', ');
        }

        return '';
    }

    private collectMetaEntries(value: unknown): string[] {
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((entry) => entry.trim())
                .filter(Boolean);
        }

        if (Array.isArray(value)) {
            return value.flatMap((entry) => this.collectMetaEntries(entry));
        }

        return [];
    }

    private syncNamedMetaTag(name: string, content: string): void {
        if (content) {
            this.meta.updateTag({ name, content });
            return;
        }

        this.meta.removeTag(`name='${ name }'`);
    }

    private syncHreflangLinks(head: HTMLElement, canonicalUrl: string, activeLang: string): void {
        Array.from(head.querySelectorAll("link[rel='alternate'][data-zlp-hreflang='true']"))
            .forEach((element) => element.remove());

        const languages = this.resolveSupportedLanguages();
        if (languages.length <= 1) {
            return;
        }

        const defaultLanguage = this.resolveDefaultLanguage(activeLang, languages);
        languages.forEach((language) => {
            this.appendHreflangLink(head, language, this.withLangParam(canonicalUrl, language));
        });
        this.appendHreflangLink(head, 'x-default', this.withLangParam(canonicalUrl, defaultLanguage));
    }

    private appendHreflangLink(head: HTMLElement, hreflang: string, href: string): void {
        const link = this.doc.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', hreflang);
        link.setAttribute('href', href);
        link.setAttribute('data-zlp-hreflang', 'true');
        head.appendChild(link);
    }

    private resolveSupportedLanguages(): readonly string[] {
        return this.variables.getArray<unknown>('i18n.supportedLanguages')
            .map((entry) => this.normalizeLanguageEntry(entry))
            .filter((entry, index, entries) => entry.length > 0 && entries.indexOf(entry) === index);
    }

    private resolveDefaultLanguage(activeLang: string, languages: readonly string[]): string {
        const configured = normalizeLocaleCode(this.variables.getString('i18n.defaultLanguage'));
        if (configured && languages.includes(configured)) {
            return configured;
        }

        const normalizedActive = normalizeLocaleCode(activeLang);
        return languages.includes(normalizedActive) ? normalizedActive : languages[0] ?? normalizedActive;
    }

    private normalizeLanguageEntry(entry: unknown): string {
        if (typeof entry === 'string') {
            return normalizeLocaleCode(entry);
        }

        if (this.isRecord(entry)) {
            return normalizeLocaleCode(entry['code'] ?? entry['lang'] ?? entry['locale']);
        }

        return '';
    }

    private stripAdQueryParams(rawUrl: string): string {
        const cleaned = this.cleanString(rawUrl);
        if (!cleaned) {
            return '';
        }

        try {
            const url = new URL(cleaned, this.defaultOrigin());
            Array.from(url.searchParams.keys()).forEach((param) => {
                if (AD_CANONICAL_QUERY_PARAMS.has(param) || SENSITIVE_CANONICAL_QUERY_PARAM_PATTERN.test(param)) {
                    url.searchParams.delete(param);
                }
            });
            url.hash = '';
            return url.toString();
        } catch {
            return cleaned;
        }
    }

    private resolveEffectiveCanonicalUrl(rawUrl: string, origin: string, siteSeo: ReturnType<RuntimeConfigService['seoDefaults']>): string {
        const canonicalUrl = this.stripAdQueryParams(rawUrl);
        if (siteSeo?.enforceCanonicalHost !== true || !this.cleanString(siteSeo?.canonicalOrigin)) {
            return canonicalUrl;
        }

        try {
            const canonicalOrigin = new URL(this.cleanString(siteSeo.canonicalOrigin), origin);
            const canonical = new URL(canonicalUrl, canonicalOrigin);
            return new URL(`${ canonical.pathname }${ canonical.search }`, canonicalOrigin).toString();
        } catch {
            return canonicalUrl;
        }
    }

    private withLangParam(rawUrl: string, lang: string): string {
        try {
            const url = new URL(rawUrl, this.defaultOrigin());
            url.searchParams.set('lang', lang);
            return url.toString();
        } catch {
            return rawUrl;
        }
    }

    private asRecord(value: unknown): Record<string, unknown> {
        return this.isRecord(value) ? value : {};
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    private isLocaleMapRecord(value: unknown): value is Record<string, unknown> {
        if (!this.isRecord(value)) return false;

        const keys = Object.keys(value);
        if (keys.length === 0) return false;

        return keys.every((key) => {
            if (key === 'default' || key === 'fallback') return true;
            const normalized = normalizeLocaleCode(key);
            return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(normalized);
        });
    }

    private cleanString(value: unknown): string {
        return typeof value === 'string' ? value.trim() : '';
    }

    private normalizePathname(value: unknown): string {
        const pathname = this.cleanString(value) || '/';
        return pathname.startsWith('/') ? pathname : `/${ pathname }`;
    }

    private readQueryParam(key: string): string | undefined {
        const normalizedKey = this.cleanString(key);
        if (!normalizedKey) {
            return undefined;
        }

        const requestUrl = this.cleanString(this.request?.url);
        if (requestUrl) {
            try {
                return new URL(requestUrl, 'https://localhost').searchParams.get(normalizedKey) ?? undefined;
            } catch {
                return undefined;
            }
        }

        const search = this.doc.defaultView?.location?.search;
        if (!search) {
            return undefined;
        }

        return new URLSearchParams(search).get(normalizedKey) ?? undefined;
    }

    private defaultOrigin(): string {
        const resolved = this.domainResolver.resolveDomain().domain;
        return resolved ? `https://${ resolved }` : 'https://localhost';
    }

    private resolveFallbackSiteName(): string {
        const configuredName = this.runtimeConfig.appName();
        if (configuredName) {
            return configuredName;
        }

        const resolvedDomain = this.domainResolver.resolveDomain().domain;
        if (resolvedDomain) {
            return resolvedDomain;
        }

        return this.doc.defaultView?.location?.hostname || 'localhost';
    }
}
