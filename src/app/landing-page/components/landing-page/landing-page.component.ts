import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ToastService } from '../../../shared/components/utility/toast';
import { RoiNoteComponent } from '../conversion-note/conversion-note.component';
import { FaqSectionComponent } from '../faq-section/faq-section.component';
import { FeaturesSectionComponent } from '../features-section/features-section.component';
import { FinalCtaSectionComponent } from '../final-cta-section/final-cta-section.component';
import { HeroSectionComponent } from '../hero-section';
import { InteractiveProcessComponent } from '../interactive-process/interactive-process.component';
import { ServicesSectionComponent } from '../services-section/services-section.component';
import { StatsStripSectionComponent } from '../stats-strip-section/stats-strip-section.component';
import { TestimonialsSectionComponent } from '../testimonials-section/testimonials-section.component';
import { buildTestimonialListSchema } from '../testimonials-section/testimonials-section.constants';

import { buildWhatsAppUrl } from '@/app/shared/components/whatsapp-button/whatsapp-button.constants';
import { WHATSAPP_PHONE } from '@/app/shared/services/contact.constants';
import { LanguageService } from '../../../core/services/language.service';
import { AnalyticsCategories, AnalyticsEventPayload, AnalyticsEvents } from '../../../shared/services/analytics.events';
import { StructuredDataService } from '../../../shared/services/structured-data.service';
import { LandingPageI18nService } from './landing-page-i18n.service';
import type { InteractiveProcess } from './landing-page.types';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeroSectionComponent,
    RoiNoteComponent,
    FeaturesSectionComponent,
    InteractiveProcessComponent,
    ServicesSectionComponent,
    StatsStripSectionComponent,
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
  readonly analyticsEvent = output<AnalyticsEventPayload>();
  readonly WHATSAPP_PHONE = WHATSAPP_PHONE;
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

  /* toggleCalculator(): void {
    this.isCalculatorVisible.update(v => {
      const next = !v;
      this.analyticsEvent.emit({ name: AnalyticsEvents.RoiToggle, category: AnalyticsCategories.RoiCalculator, label: next ? 'open' : 'close' });
      return next;
    });
  } */
  setDemoStep(step: number): void {
    this.currentDemoStep.set(step);

    // Update demo data reactively
    this.interactiveProcess.update(demos =>
      demos.map(demo => ({
        ...demo,
        isActive: demo.step === step + 1,
      }))
    );
    this.analyticsEvent.emit({ name: AnalyticsEvents.ProcessStepChange, category: AnalyticsCategories.Process, label: String(step + 1) });
  }
  updateBusinessSize(size: 'nano' | 'micro' | 'small' | 'medium'): void {
    this.calculatorBusinessSize.set(size);
  }
  updateIndustry(industry: string): void {
    this.calculatorIndustry.set(industry);
  }
  updateVisitors(visitors: number): void {
    this.calculatorVisitors.set(visitors);
    this.analyticsEvent.emit({ name: AnalyticsEvents.RoiVisitorsChange, category: AnalyticsCategories.RoiCalculator, label: visitors.toString(), value: visitors });
  }

  nameChooser(name: string): AnalyticsEventPayload['name'] | null {
    switch (name) {
      case 'hero_primary': return AnalyticsEvents.HeroPrimaryClick;
      case 'hero_secondary': return AnalyticsEvents.HeroSecondaryClick;
      case 'services': return AnalyticsEvents.ServicesCtaClick;
      case 'faq-section': return AnalyticsEvents.FaqOpen;
      default: return null;
    }
  }

  openWhatsApp(track: boolean = true, name: string, location: string, serviceLabel?: string): void {

    const rawMessage = this.i18n.ui().contact.whatsappMessage;
    const phone = WHATSAPP_PHONE;
    const link = buildWhatsAppUrl(phone, rawMessage);
    const evtName = this.nameChooser(name);
    if (track && evtName) {
      const isService = evtName === AnalyticsEvents.ServicesCtaClick;
      const comingFromServicesSection = location === 'services';
      if (isService) {
        // Emit only if not original services section (avoid duplicates) or if we have an override label
        if (!comingFromServicesSection) {
          const label = serviceLabel || 'whatsapp-button';
          this.analyticsEvent.emit({ name: evtName, category: AnalyticsCategories.CTA, label, meta: { location, via: 'whatsapp_button' } });
        }
      } else {
        this.analyticsEvent.emit({ name: evtName, category: AnalyticsCategories.CTA, label: 'whatsapp-button', meta: { location, forwardedFrom: serviceLabel || null } });
      }
    }
    window.open(link, '_blank');
  }
  trackCTAClick(ctaType: string, location: string, name: string): void {
    const evtName = this.nameChooser(name);
    if (evtName) this.analyticsEvent.emit({ name: evtName, category: AnalyticsCategories.CTA, label: `${ location }:${ ctaType }`, meta: { location } });

    // Navigate to features section
    const featuresElement = this.doc.getElementById('features-section');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  trackSectionView(sectionName: string): void {
    this.analyticsEvent.emit({ name: AnalyticsEvents.SectionView, category: AnalyticsCategories.Navigation, label: sectionName });
  }

  // Forward child analytics with debug logging (helps diagnose missing final-cta events)
  forwardAnalytics(evt: AnalyticsEventPayload): void {
    /*  try { console.log('[LandingPage] forwardAnalytics called', evt); } catch { }
     try { if (evt?.name?.startsWith('final_cta')) console.log('[LandingPage] forwarding final_cta event', evt); } catch { } */
    this.analyticsEvent.emit(evt);
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

  private lastSectionViewSuppressedUntil = 0;
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
      'stats-strip-section',
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
            const suppressWindow = this.lastSectionViewSuppressedUntil;
            const shouldEmit = (now - last > 3_000) && (now > suppressWindow);
            if (shouldEmit) {
              lastSeen.set(id, now);
              if (!initialSeen.has(id)) initialSeen.add(id);
              this.trackSectionView(id);
            }
          }
        }
      },
      { rootMargin: '0px 0px 80% 0px', threshold: [0.5] }
    );
    const tryObserve = () => {
      ids.forEach(id => {
        const el = this.doc.getElementById(id);
        if (el) observer.observe(el);
      });
    };
    tryObserve();
    const mo = new MutationObserver(() => tryObserve());
    mo.observe(this.doc.body, { childList: true, subtree: true });
    const interval = setInterval(() => {
      if (ids.every(id => initialSeen.has(id))) {
        mo.disconnect();
        clearInterval(interval);
      }
    }, 2000);
  }

  private setupReadDepthTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    // Granular scroll depth milestones (10% increments)
    const milestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const hit = new Set<number>();

    const scrollEl = (document.scrollingElement || document.documentElement || document.body) as HTMLElement;
    const computeDepth = (): number => {
      const docEl = document.documentElement;
      // Prefer the actual scrolling element for these metrics
      const scrollTop = scrollEl.scrollTop;
      const scrollHeight = scrollEl.scrollHeight;
      const viewport = window.innerHeight || docEl.clientHeight;
      const denom = Math.max(1, scrollHeight - viewport);
      const progress = Math.round((scrollTop / denom) * 100);
      return Math.min(100, Math.max(0, progress));
    };

    const cleanup = () => {
      window.removeEventListener('scroll', throttled as any);
      if (scrollEl) scrollEl.removeEventListener('scroll', throttled as any);
      window.removeEventListener('resize', throttled as any);
      window.removeEventListener('orientationchange', throttled as any);
      try { mo.disconnect(); } catch { }
    };

    const onScrollOrResize = () => {
      const depth = computeDepth();
      for (const m of milestones) {
        if (depth >= m && !hit.has(m)) {
          hit.add(m);
          this.analyticsEvent.emit({
            name: AnalyticsEvents.ScrollDepth,
            category: AnalyticsCategories.Navigation,
            label: `${ m }%`,
            value: m,
            meta: { depthPercent: m }
          });
        }
      }
      if (hit.size === milestones.length) {
        cleanup();
      }
    };

    let rafId: number | null = null;
    const throttled = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        onScrollOrResize();
      });
    };

    const onScrollTarget = throttled;
    window.addEventListener('scroll', throttled, { passive: true });
    // Also listen on the actual scroll container in case the app uses a custom scroller
    if (scrollEl && scrollEl !== (document as any)) {
      scrollEl.addEventListener('scroll', onScrollTarget, { passive: true });
    }
    window.addEventListener('resize', throttled);
    window.addEventListener('orientationchange', throttled);

    // Observe DOM mutations that may change document height (e.g., late CSS/images/deferred content)
    const mo = new MutationObserver(() => onScrollOrResize());
    try { mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: false }); } catch { }

    // Allow CSS/layout to settle before first measurement and then run an initial check.
    requestAnimationFrame(() => {
      setTimeout(() => {
        // run once even if the user hasn't scrolled, to set the baseline
        onScrollOrResize();
      }, 120);
    });

    // Cleanup is invoked inside onScrollOrResize once all milestones are reached
  }
}
