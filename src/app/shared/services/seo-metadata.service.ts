import type { TSeoPayload } from '@/app/shared/types/config-payloads.types';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { toOpenGraphLocale } from '../i18n/locale.utils';
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

            const draftTitle = typeof seo?.title === 'string' && seo.title.trim().length > 0
                ? seo.title
                : undefined;
            const draftDescription = typeof seo?.description === 'string' && seo.description.trim().length > 0
                ? seo.description
                : undefined;
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
            const openGraphDefaults = this.asRecord(siteSeo?.openGraph);
            const twitterDefaults = this.asRecord(siteSeo?.twitter);
            const openGraph = {
                ...openGraphDefaults,
                ...this.asRecord(seo?.openGraph),
            };
            const twitter = {
                ...twitterDefaults,
                ...this.asRecord(seo?.twitter),
            };
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
                linkEl.setAttribute('href', String(seo?.canonical ?? url));
            }
        } catch {
            // no-op for SSR
        }
    }

    private asRecord(value: unknown): Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
