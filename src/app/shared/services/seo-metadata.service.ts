import type { TSeoPayload } from '@/app/shared/types/config-payloads.types';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { normalizeLocaleCode, resolveLocaleMapValue, toOpenGraphLocale } from '../i18n/locale.utils';
import { DomainResolverService } from './domain-resolver.service';
import { RuntimeConfigService } from './runtime-config.service';

@Injectable({ providedIn: 'root' })
export class SeoMetadataService {
    private readonly doc = inject(DOCUMENT);
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly domainResolver = inject(DomainResolverService);
    private readonly runtimeConfig = inject(RuntimeConfigService);

    apply(lang: string, seo: TSeoPayload | null): void {
        try {
            if (typeof document === 'undefined') {
                return;
            }

            document.documentElement.setAttribute('lang', lang);
            document.documentElement.setAttribute('dir', 'ltr');

            const draftTitle = this.resolveLocalizedText(seo?.title, lang);
            const draftDescription = this.resolveLocalizedText(seo?.description, lang);
            const siteSeo = this.runtimeConfig.seoDefaults();
            const fallbackSiteName = this.cleanString(siteSeo?.siteName) || this.resolveFallbackSiteName();
            const fallbackDescription = this.cleanString(siteSeo?.description) || this.runtimeConfig.appDescription();
            const seoTitle = draftTitle || this.cleanString(siteSeo?.title) || fallbackSiteName;
            const seoDescription = draftDescription || fallbackDescription || '';

            this.title.setTitle(seoTitle);
            this.meta.updateTag({ name: 'description', content: seoDescription });

            const origin = this.doc.defaultView?.location?.origin || this.cleanString(siteSeo?.canonicalOrigin) || this.defaultOrigin();
            const pathname = this.doc.defaultView?.location?.pathname || '/';
            const url = `${ origin }${ pathname || '/' }`;
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
            const defaultImage = this.cleanString(siteSeo?.defaultImage)
                || this.cleanString(openGraphDefaults['image'])
                || this.cleanString(twitterDefaults['image'])
                || `${ origin }/assets/og-1200x630.svg`;

            this.meta.updateTag({ property: 'og:title', content: String(openGraph['title'] ?? seoTitle) });
            this.meta.updateTag({ property: 'og:description', content: String(openGraph['description'] ?? seoDescription) });
            this.meta.updateTag({ property: 'og:type', content: String(openGraph['type'] ?? 'website') });
            this.meta.updateTag({ property: 'og:url', content: String(openGraph['url'] ?? url) });
            this.meta.updateTag({ property: 'og:image', content: String(openGraph['image'] ?? defaultImage) });
            this.meta.updateTag({ property: 'og:locale', content: String(openGraph['locale'] ?? ogLocale) });
            this.meta.updateTag({ property: 'og:site_name', content: String(openGraph['site_name'] ?? fallbackSiteName) });

            this.meta.updateTag({ name: 'twitter:card', content: String(twitter['card'] ?? 'summary_large_image') });
            this.meta.updateTag({ name: 'twitter:title', content: String(twitter['title'] ?? seoTitle) });
            this.meta.updateTag({ name: 'twitter:description', content: String(twitter['description'] ?? seoDescription) });
            this.meta.updateTag({ name: 'twitter:image', content: String(twitter['image'] ?? defaultImage) });

            const head = this.doc.head;
            if (head) {
                let linkEl = head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
                if (!linkEl) {
                    linkEl = this.doc.createElement('link');
                    linkEl.setAttribute('rel', 'canonical');
                    head.appendChild(linkEl);
                }
                linkEl.setAttribute('href', this.resolveLocalizedText(seo?.canonical, lang) || url);
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
            return typeof resolved === 'string' ? resolved.trim() : resolved;
        }

        if (this.isRecord(value)) {
            return this.resolveLocalizedRecord(value, lang);
        }

        return value;
    }

    private resolveLocalizedText(value: unknown, lang: string): string {
        if (typeof value === 'string') {
            return value.trim();
        }

        if (this.isLocaleMapRecord(value)) {
            const resolved = resolveLocaleMapValue(value, lang);
            return typeof resolved === 'string' ? resolved.trim() : '';
        }

        return '';
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
