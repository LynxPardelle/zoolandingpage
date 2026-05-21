import type { TDraftSiteIconConfig, TSeoPayload } from '@/app/shared/types/config-payloads.types';
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
const MANAGED_BROWSER_ICON_ATTR = 'data-zlp-browser-icon';
const DEFAULT_BROWSER_ICONS: TDraftSiteIconConfig = {
    favicon: '/assets/brand/zoolandingpage-default-favicon.svg',
};
const DEFAULT_SOCIAL_IMAGE_HREF = 'https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/seo-images/zoolandingpage-zoositioweb-default-logo-card.jpg';
const DEFAULT_SOCIAL_IMAGE_WIDTH = '1200';
const DEFAULT_SOCIAL_IMAGE_HEIGHT = '630';

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
            const defaultSocialImage = this.resolveAbsoluteAssetUrl(DEFAULT_SOCIAL_IMAGE_HREF, origin);
            const defaultImage = this.resolveAbsoluteAssetUrl(this.cleanString(siteSeo?.defaultImage), origin)
                || this.resolveAbsoluteAssetUrl(this.cleanString(openGraphDefaults['image']), origin)
                || this.resolveAbsoluteAssetUrl(this.cleanString(twitterDefaults['image']), origin)
                || defaultSocialImage
                || `${ origin }/assets/og-1200x630.svg`;
            const ogTitle = this.cleanString(openGraph['title']) || seoTitle;
            const ogDescription = this.cleanString(openGraph['description']) || seoDescription;
            const ogType = this.cleanString(openGraph['type']) || 'website';
            const ogImage = this.resolveAbsoluteAssetUrl(this.cleanString(openGraph['image']), origin) || defaultImage;
            const isDefaultSocialImage = defaultSocialImage.length > 0 && ogImage === defaultSocialImage;
            const ogImageSecureUrl = this.resolveAbsoluteAssetUrl(this.cleanString(openGraph['image:secure_url']), origin)
                || this.resolveAbsoluteAssetUrl(this.cleanString(openGraph['imageSecureUrl']), origin)
                || (ogImage.startsWith('https://') ? ogImage : '');
            const ogImageType = this.cleanString(openGraph['image:type'])
                || this.cleanString(openGraph['imageType'])
                || this.resolveImageMimeType(ogImage);
            const ogImageWidth = this.cleanString(openGraph['image:width'])
                || this.cleanString(openGraph['imageWidth'])
                || (isDefaultSocialImage ? DEFAULT_SOCIAL_IMAGE_WIDTH : '');
            const ogImageHeight = this.cleanString(openGraph['image:height'])
                || this.cleanString(openGraph['imageHeight'])
                || (isDefaultSocialImage ? DEFAULT_SOCIAL_IMAGE_HEIGHT : '');
            const imageAlt = this.cleanString(openGraph['image:alt'])
                || this.cleanString(openGraph['imageAlt'])
                || this.cleanString(twitter['image:alt'])
                || this.cleanString(twitter['imageAlt'])
                || ogTitle;
            const ogSiteName = this.cleanString(openGraph['site_name']) || fallbackSiteName;
            const twitterCard = this.cleanString(twitter['card']) || 'summary_large_image';
            const twitterTitle = this.cleanString(twitter['title']) || seoTitle;
            const twitterDescription = this.cleanString(twitter['description']) || seoDescription;
            const twitterImage = this.resolveAbsoluteAssetUrl(this.cleanString(twitter['image']), origin) || defaultImage;

            this.meta.updateTag({ property: 'og:title', content: ogTitle });
            this.meta.updateTag({ property: 'og:description', content: ogDescription });
            this.meta.updateTag({ property: 'og:type', content: ogType });
            this.meta.updateTag({ property: 'og:url', content: openGraphUrl });
            this.meta.updateTag({ property: 'og:image', content: ogImage });
            this.syncPropertyMetaTag('og:image:secure_url', ogImageSecureUrl);
            this.syncPropertyMetaTag('og:image:type', ogImageType);
            this.syncPropertyMetaTag('og:image:width', ogImageWidth);
            this.syncPropertyMetaTag('og:image:height', ogImageHeight);
            this.syncPropertyMetaTag('og:image:alt', imageAlt);
            this.meta.updateTag({ property: 'og:locale', content: this.cleanString(openGraph['locale']) || ogLocale });
            this.meta.updateTag({ property: 'og:site_name', content: ogSiteName });

            this.meta.updateTag({ name: 'twitter:card', content: twitterCard });
            this.meta.updateTag({ name: 'twitter:title', content: twitterTitle });
            this.meta.updateTag({ name: 'twitter:description', content: twitterDescription });
            this.meta.updateTag({ name: 'twitter:image', content: twitterImage });
            this.syncNamedMetaTag('twitter:image:alt', imageAlt);

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
                this.syncBrowserIcons(head, this.resolveBrowserIcons());
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

    private syncPropertyMetaTag(property: string, content: string): void {
        if (content) {
            this.meta.updateTag({ property, content });
            return;
        }

        this.meta.removeTag(`property='${ property }'`);
    }

    private resolveBrowserIcons(): TDraftSiteIconConfig {
        const runtimeConfig = this.runtimeConfig as RuntimeConfigService & {
            browserIcons?: () => TDraftSiteIconConfig | null;
        };
        const configured = typeof runtimeConfig.browserIcons === 'function' ? runtimeConfig.browserIcons() : null;

        return {
            ...DEFAULT_BROWSER_ICONS,
            ...(configured ?? {}),
        };
    }

    private syncBrowserIcons(head: HTMLElement, icons: TDraftSiteIconConfig): void {
        const favicon = this.cleanString(icons.favicon) || this.cleanString(DEFAULT_BROWSER_ICONS.favicon);
        this.syncBrowserIconLink(head, 'icon', favicon, { type: this.resolveIconMimeType(favicon) });
        this.syncBrowserIconLink(head, 'apple-touch-icon', this.cleanString(icons.appleTouchIcon));

        const maskIconColor = this.cleanString(icons.maskIconColor) || this.cleanString(icons.themeColor);
        this.syncBrowserIconLink(head, 'mask-icon', this.cleanString(icons.maskIcon), { color: maskIconColor });
        this.syncBrowserIconLink(head, 'manifest', this.cleanString(icons.manifest));
        this.syncThemeColor(head, this.cleanString(icons.themeColor));
    }

    private syncBrowserIconLink(head: HTMLElement, rel: string, href: string, attributes: Record<string, string> = {}): void {
        let link = head.querySelector(`link[rel="${ rel }"]`) as HTMLLinkElement | null;
        if (!href) {
            if (link?.getAttribute(MANAGED_BROWSER_ICON_ATTR) === 'true') {
                link.remove();
            }
            return;
        }

        if (!link) {
            link = this.doc.createElement('link');
            link.setAttribute('rel', rel);
            head.appendChild(link);
        }

        link.setAttribute(MANAGED_BROWSER_ICON_ATTR, 'true');
        link.setAttribute('href', href);
        Object.entries(attributes).forEach(([key, value]) => {
            if (value) {
                link.setAttribute(key, value);
            } else {
                link.removeAttribute(key);
            }
        });
    }

    private syncThemeColor(head: HTMLElement, color: string): void {
        let meta = head.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
        if (!color) {
            if (meta?.getAttribute(MANAGED_BROWSER_ICON_ATTR) === 'true') {
                meta.remove();
            }
            return;
        }

        if (!meta) {
            meta = this.doc.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            head.appendChild(meta);
        }

        meta.setAttribute(MANAGED_BROWSER_ICON_ATTR, 'true');
        meta.setAttribute('content', color);
    }

    private resolveIconMimeType(href: string): string {
        const path = this.cleanString(href).split(/[?#]/)[0]?.toLowerCase() ?? '';
        if (path.endsWith('.svg')) return 'image/svg+xml';
        if (path.endsWith('.png')) return 'image/png';
        if (path.endsWith('.ico')) return 'image/x-icon';
        if (path.endsWith('.webp')) return 'image/webp';
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
        return '';
    }

    private resolveImageMimeType(href: string): string {
        const path = this.cleanString(href).split(/[?#]/)[0]?.toLowerCase() ?? '';
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
        if (path.endsWith('.png')) return 'image/png';
        if (path.endsWith('.webp')) return 'image/webp';
        if (path.endsWith('.gif')) return 'image/gif';
        if (path.endsWith('.svg')) return 'image/svg+xml';
        return '';
    }

    private resolveAbsoluteAssetUrl(value: string, origin: string): string {
        const trimmed = this.cleanString(value);
        if (!trimmed || trimmed.startsWith('//')) return '';

        try {
            const url = new URL(trimmed, origin);
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
        } catch {
            return '';
        }
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
