import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Meta, Title } from '@angular/platform-browser';
import { ToastService } from '../../../shared/components/utility/toast';
import { ConversionCalculatorSectionComponent } from '../conversion-calculator-section/conversion-calculator-section.component';
import { RoiNoteComponent } from '../conversion-note/conversion-note.component';
import { FaqSectionComponent } from '../faq-section/faq-section.component';
import { FeaturesSectionComponent } from '../features-section/features-section.component';
import { FinalCtaSectionComponent } from '../final-cta-section/final-cta-section.component';
import { HeroSectionComponent } from '../hero-section';
import { InteractiveProcessComponent } from '../interactive-process/interactive-process.component';
import { ServicesSectionComponent } from '../services-section/services-section.component';
import { TestimonialsSectionComponent } from '../testimonials-section/testimonials-section.component';
import { buildTestimonialListSchema } from '../testimonials-section/testimonials-section.constants';

import { LanguageService } from '../../../core/services/language.service';
import { AnalyticsCategories, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { AnalyticsService } from '../../../shared/services/analytics.service';
import { StructuredDataService } from '../../../shared/services/structured-data.service';
import { LandingPageI18nService } from './landing-page-i18n.service';
import type { InteractiveProcess } from './landing-page.types';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    HeroSectionComponent,
    RoiNoteComponent,
    FeaturesSectionComponent,
    InteractiveProcessComponent,
    ServicesSectionComponent,
    ConversionCalculatorSectionComponent,
    TestimonialsSectionComponent,
    FaqSectionComponent,
    FinalCtaSectionComponent,
  ],
  templateUrl: './landing-page.component.html',
})
export class LandingPageComponent {
  // SEO services
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc: Document = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private readonly lang = inject(LanguageService);
  readonly i18n = inject(LandingPageI18nService);
  private readonly structured = inject(StructuredDataService);
  private readonly analytics = inject(AnalyticsService);
  readonly currentDemoStep = signal(0);
  readonly isCalculatorVisible = signal(false);
  readonly calculatorBusinessSize = signal<'nano' | 'micro' | 'small' | 'medium'>('micro');
  readonly calculatorIndustry = signal('ecommerce');
  readonly calculatorVisitors = signal(1000);

  // Hero content centralized through i18n service
  readonly heroData = this.i18n.hero;

  // Features content centralized through i18n service
  readonly features = this.i18n.features;
  // Services content centralized through i18n service
  readonly services = this.i18n.services;
  // Testimonials content centralized through i18n service
  readonly testimonials = this.i18n.testimonials;

  // UI text centralized through i18n service
  readonly testimonialsTitle = computed(() => this.i18n.ui().sections.testimonials.title);
  readonly testimonialsSubtitle = computed(() => this.i18n.ui().sections.testimonials.subtitle);

  // Final CTA content centralized through i18n service
  readonly finalCta = computed(() => this.i18n.ui().sections.finalCta);

  // Loading messages from centralized translations
  readonly loadingMessages = computed(() => this.i18n.ui().loading);
  // Interactive process content centralized through i18n service (signal for reactivity)
  readonly interactiveProcess = signal<readonly InteractiveProcess[]>(this.i18n.process());

  // Conversion/Revenue calculation based on business size, industry and visitors (migrated from legacy App component)
  readonly calculatedConversion = computed(() => {
    const businessSize = this.calculatorBusinessSize();
    const industry = this.calculatorIndustry();
    const visitors = this.calculatorVisitors();

    let baseConversion = 150;
    let conversionRate = 0.02;

    const sizeMultipliers = {
      nano: { conversion: 1.2 },
      micro: { conversion: 1.5 },
      small: { conversion: 1.8 },
      medium: { conversion: 2.2 },
    } as const;

    const industryMultipliers: Record<string, { conversion: number; }> = {
      ecommerce: { conversion: 1.8 },
      services: { conversion: 1.5 },
      restaurant: { conversion: 1.3 },
      health: { conversion: 1.6 },
      education: { conversion: 1.4 },
      'real-estate': { conversion: 2.0 },
      consulting: { conversion: 1.7 },
    };

    const sizeMultiplier = sizeMultipliers[businessSize];
    const industryMultiplier = industryMultipliers[industry] || industryMultipliers['services'];

    const finalConversion = Math.round(baseConversion * sizeMultiplier.conversion * industryMultiplier.conversion);

    const averageOrderValue =
      businessSize === 'nano' ? 500 : businessSize === 'micro' ? 800 : businessSize === 'small' ? 1200 : 2000;
    const monthlyIncrease = Math.round(visitors * finalConversion * averageOrderValue * 0.3);

    return {
      conversionPercentage: finalConversion,
      monthlyIncrease,
      conversionImprovement: Math.round((finalConversion / conversionRate) * 10) / 10,
    };
  });

  toggleCalculator(): void {
    this.isCalculatorVisible.update(v => {
      const next = !v;
      this.analytics.track(AnalyticsEvents.RoiToggle, {
        category: AnalyticsCategories.RoiCalculator,
        label: next ? 'open' : 'close',
      });
      return next;
    });
  }
  setDemoStep(step: number): void {
    this.currentDemoStep.set(step);

    // Update demo data reactively
    this.interactiveProcess.update(demos =>
      demos.map(demo => ({
        ...demo,
        isActive: demo.step === step + 1,
      }))
    );
    this.analytics.track(AnalyticsEvents.ProcessStepChange, {
      category: AnalyticsCategories.Process,
      label: String(step + 1),
    });
  }
  updateBusinessSize(size: 'nano' | 'micro' | 'small' | 'medium'): void {
    this.calculatorBusinessSize.set(size);
  }
  updateIndustry(industry: string): void {
    this.calculatorIndustry.set(industry);
  }
  updateVisitors(visitors: number): void {
    this.calculatorVisitors.set(visitors);
    this.analytics.track(AnalyticsEvents.RoiVisitorsChange, {
      category: AnalyticsCategories.RoiCalculator,
      label: visitors.toString(),
      value: visitors,
    });
  }
  openWhatsApp(): void {
    const rawMessage = this.i18n.ui().contact.whatsappMessage;
    const message = encodeURIComponent(rawMessage);
    const phone = '+525522699563';
    const link = `https://wa.me/${ phone }?text=${ message }`;
    // Track whatsapp click (hero or other locations using this helper)
    this.analytics.track(AnalyticsEvents.WhatsAppClick, {
      category: AnalyticsCategories.Engagement,
      label: phone,
      meta: { length: rawMessage.length, location: 'helper' },
    });
    window.open(link, '_blank');
  }
  trackCTAClick(ctaType: string, location: string): void {
    this.analytics.track(AnalyticsEvents.CtaClick, {
      category: AnalyticsCategories.CTA,
      label: `${ location }:${ ctaType }`,
      meta: { location, variant: ctaType },
    });
  }
  trackSectionView(sectionName: string): void {
    this.analytics.track(AnalyticsEvents.SectionView, {
      category: AnalyticsCategories.Navigation,
      label: sectionName,
    });
  }

  // Inject high-level structured data once on component init (browser only)
  constructor() {
    // Update interactive process when language changes
    effect(() => {
      const processTranslations = this.i18n.process();
      this.interactiveProcess.set(processTranslations);
    });

    // Reactive SEO/meta updates on language changes
    effect(() => {
      const lang = this.lang.currentLanguage();
      const isEs = lang === 'es';
      const seoTitle = isEs
        ? 'Landing Page Optimizada: Convierte visitas en clientes | ZoolandingPage'
        : 'Optimized Landing Page: Turn visits into customers | ZoolandingPage';
      const seoDesc = isEs
        ? 'Publica una landing rápida, clara y medible. Más cierres de venta, mejores decisiones con datos. Suscripción desde 900 MXN/mes (incluye dominio, alojamiento y medición).'
        : 'Launch a fast, clear and measurable landing. More conversions, better decisions with data. Plans from 900 MXN/month (domain, hosting and analytics included).';

      this.titleSvc.setTitle(seoTitle);
      this.meta.updateTag({ name: 'description', content: seoDesc });

      // Open Graph
      const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : 'https://zoolandingpage.com';
      const url = origin + '/';
      const ogLocale = isEs ? 'es_ES' : 'en_US';
      const ogImage = origin + '/assets/og-1200x630.svg';
      this.meta.updateTag({ property: 'og:title', content: seoTitle });
      this.meta.updateTag({ property: 'og:description', content: seoDesc });
      this.meta.updateTag({ property: 'og:type', content: 'website' });
      this.meta.updateTag({ property: 'og:url', content: url });
      this.meta.updateTag({ property: 'og:image', content: ogImage });
      this.meta.updateTag({ property: 'og:locale', content: ogLocale });
      this.meta.updateTag({ property: 'og:site_name', content: 'Zoo Landing Page' });

      // Twitter Card
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
      this.meta.updateTag({ name: 'twitter:title', content: seoTitle });
      this.meta.updateTag({ name: 'twitter:description', content: seoDesc });
      this.meta.updateTag({ name: 'twitter:image', content: ogImage });

      // Canonical link
      const head = this.doc.head;
      if (head) {
        let linkEl = head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
        if (!linkEl) {
          linkEl = this.doc.createElement('link');
          linkEl.setAttribute('rel', 'canonical');
          head.appendChild(linkEl);
        }
        linkEl.setAttribute('href', url);
      }
    });
    // Website
    this.structured.injectOnce('sd:website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Zoo Landing Page',
      url: 'https://zoolandingpage.com/',
      inLanguage: this.lang.currentLanguage(),
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://zoolandingpage.com/?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    });
    // Organization
    this.structured.injectOnce('sd:org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Zoo Landing',
      url: 'https://zoolandingpage.com/',
      logo: 'https://zoolandingpage.com/assets/logo-512x512.svg',
      sameAs: [
        'https://www.facebook.com/',
        'https://www.instagram.com/',
        'https://www.linkedin.com/'
      ],
    });
    // Testimonials as ItemList of Review
    const items = this.testimonials();
    this.structured.injectOnce('sd:testimonials', buildTestimonialListSchema(items as any));

    // Auto section view tracking (browser only)
    try {
      afterNextRender(() => {
        this.setupSectionViewTracking();
        this.setupReadDepthTracking();
      });
    } catch {
      // no-op for SSR
    }
  }

  private setupSectionViewTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }
    const ids = [
      'home',
      'conversion-section',
      'features-section',
      'process-section',
      'services-section',
      'conversion-calculator-section',
      'testimonials-section',
      'faq-section',
      'contact-section',
    ];
    const lastSeen = new Map<string, number>();
    const initialSeen = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            const id = entry.target.id;
            if (!id) continue;
            const now = Date.now();
            const last = lastSeen.get(id) ?? 0;
            const shouldEmit = now - last > 30_000; // re-emit after 30s since last sighting
            if (shouldEmit) {
              lastSeen.set(id, now);
              if (!initialSeen.has(id)) initialSeen.add(id);
              this.trackSectionView(id);
            }
          }
        }
      },
      { rootMargin: '0px 0px -40% 0px', threshold: [0.1, 0.25, 0.5] }
    );
    const tryObserve = () => {
      ids.forEach(id => {
        const el = this.doc.getElementById(id);
        if (el) observer.observe(el);
      });
    };
    // Initial attempt (some sections might be deferred)
    tryObserve();
    // Re-attach when new nodes are added (for @defer placeholders loading later)
    const mo = new MutationObserver(() => tryObserve());
    mo.observe(this.doc.body, { childList: true, subtree: true });
    // Stop mutation observing once all tracked sections have been seen initially
    const interval = setInterval(() => {
      if (ids.every(id => initialSeen.has(id))) {
        mo.disconnect();
        clearInterval(interval);
      }
    }, 2000);
  }

  private setupReadDepthTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const milestones = [25, 50, 75, 100];
    const hit = new Set<number>();
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.pageYOffset || doc.scrollTop;
      const viewBottom = scrollTop + window.innerHeight;
      const height = doc.scrollHeight || 1;
      const depth = Math.min(100, Math.round((viewBottom / height) * 100));
      for (const m of milestones) {
        if (depth >= m && !hit.has(m)) {
          hit.add(m);
          this.analytics.track(AnalyticsEvents.ScrollDepth, {
            category: AnalyticsCategories.Navigation,
            label: `${ m }%`,
            value: m,
          });
        }
      }
      if (hit.size === milestones.length) window.removeEventListener('scroll', throttled);
    };
    let ticking = false;
    const throttled = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', throttled, { passive: true });
    // Trigger initial check
    onScroll();
  }
}
