import { THeaderNavItem } from "@/app/core/types/layout.types";
import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { TGenericComponent } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types";
import { AngoraCombosService } from "@/app/shared/services/angora-combos.service";
import { ConfigBootstrapService } from "@/app/shared/services/config-bootstrap.service";
import { ConfigStoreService } from "@/app/shared/services/config-store.service";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { DomainResolverService } from "@/app/shared/services/domain-resolver.service";
import { StructuredDataService } from "@/app/shared/services/structured-data.service";
import type { TAnalyticsConfigPayload, TSeoPayload } from "@/app/shared/types/config-payloads.types";
import { AsyncPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  afterEveryRender,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from "@angular/router";
import { NgxAngoraService } from "ngx-angora-css";
import { filter } from "rxjs/operators";
import { environment } from "../../../../../environments/environment";
import { GenericModalComponent } from "../../../../shared/components/generic-modal/generic-modal.component";
import { GenericToastComponent } from "../../../../shared/components/generic-toast";
import {
  AnalyticsCategories,
  AnalyticsEventPayload,
  AnalyticsEvents,
} from "../../../../shared/services/analytics.events";
import { AnalyticsService } from "../../../../shared/services/analytics.service";
import { LanguageService } from "../../../../shared/services/language.service";
import { ThemeService } from "../../../../shared/services/theme.service";
import { forwardAnalyticsEvent } from "../../../../shared/utility/forwardAnalyticsEvent.utility";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    WrapperOrchestrator,
    GenericModalComponent,
    GenericToastComponent,
  ],
  templateUrl: "./app-shell.component.html",
})
export class AppShellComponent {
  // SEO services
  private readonly doc: Document = inject(DOCUMENT);
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);
  private readonly structured = inject(StructuredDataService);
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  readonly debugMode = environment.features.debugMode;
  // App state
  readonly appName = environment.app.name;

  // Computed properties with proper typing
  readonly isProduction = computed(() => environment.production);

  // Services
  private readonly router = inject(Router);
  readonly analytics = inject(AnalyticsService);
  private readonly _ank = inject(NgxAngoraService);
  private readonly events = inject(AnalyticsService);
  private angoraHasBeenInitialized = false;
  // Ensure global Theme/Language services are initialized at shell level
  private readonly _theme = inject(ThemeService);
  private readonly _lang = inject(LanguageService);
  // Public alias for template usage
  readonly lang = this._lang;
  private readonly activeHref = signal<string | null>(null);
  private readonly configBootstrap = inject(ConfigBootstrapService);
  private readonly configStore = inject(ConfigStoreService);
  private readonly domainResolver = inject(DomainResolverService);
  private readonly combosService = inject(AngoraCombosService);

  private readonly draftSeo = signal<TSeoPayload | null>(null);
  private readonly draftAnalytics = signal<TAnalyticsConfigPayload | null>(null);
  private readonly readDepthMilestones = signal<readonly number[]>([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  private readonly sectionViewIds = signal<readonly string[]>([
    'home',
    'conversion-section',
    'features-section',
    'process-section',
    'services-section',
    'stats-strip-section',
    'testimonials-section',
    'faq-section',
    'contact-section',
  ]);

  readonly rootComponentsIds = signal<readonly (string | TGenericComponent)[]>([
    'skipToMainLink',
    'siteHeader',
    'landingPage',
    'siteFooter'
  ]);

  readonly modalRootIds = signal<readonly string[]>([
    'modalAnalyticsConsentRoot',
    'modalDemoRoot',
    'modalTermsRoot',
    'modalDataUseRoot'
  ]);


  // Minimal header config until centralized state is introduced
  headerConfig = computed(() => ({
    // Language-aware navigation labels (doc-first i18n)
    navItems:
      this._lang.currentLanguage() === "en"
        ? [
          {
            label: "Home",
            href: "#home",
            isActive: this.activeHref() === "#home",
            isExternal: false,
          },
          {
            label: "Benefits",
            href: "#features-section",
            isActive: this.activeHref() === "#features-section",
            isExternal: false,
          },
          {
            label: "Process",
            href: "#process-section",
            isActive: this.activeHref() === "#process-section",
            isExternal: false,
          },
          {
            label: "Services",
            href: "#services-section",
            isActive: this.activeHref() === "#services-section",
            isExternal: false,
          },
          {
            label: "Contact",
            href: "#contact-section",
            isActive: this.activeHref() === "#contact-section",
            isExternal: false,
          },
        ]
        : [
          {
            label: "Inicio",
            href: "#home",
            isActive: this.activeHref() === "#home",
            isExternal: false,
          },
          {
            label: "Beneficios",
            href: "#features-section",
            isActive: this.activeHref() === "#features-section",
            isExternal: false,
          },
          {
            label: "Proceso",
            href: "#process-section",
            isActive: this.activeHref() === "#process-section",
            isExternal: false,
          },
          {
            label: "Servicios",
            href: "#services-section",
            isActive: this.activeHref() === "#services-section",
            isExternal: false,
          },
          {
            label: "Contacto",
            href: "#contact-section",
            isActive: this.activeHref() === "#contact-section",
            isExternal: false,
          },
        ],
    useGradient: true,
    gradientFromKey: "bgColor",
    gradientToKey: "secondaryBgColor",
    enableScrollSpy: true,
    transparentUntilScroll: true,
    elevateOnScroll: true,
    showThemeToggle: true,
    showLanguageToggle: true,
  }));

  constructor() {
    // Track subsequent page views on navigation end
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((evt) => {
        this.analytics.track(AnalyticsEvents.PageView, {
          category: AnalyticsCategories.Navigation,
          label: evt.urlAfterRedirects,
        });
      });

    // Initialize Angora CSS once, then regenerate after every render
    try {
      afterNextRender(async () => {
        // Prompt for analytics consent early if needed
        this.analytics.promptForConsentIfNeeded();
        this.initializeAngoraConfiguration();
        await this.applyConfigOverrides();
        this._ank.cssCreate();
        if (this.debugMode) {
          this.removeAnkDNoneFromAnkTimer();
        }
        setTimeout(() => {
          const classes: string[] = [...this.orchestrator.getAllTheClassesFromComponents(), 'btnBaseVALSVL1_25remVL0_75remVL'];
          console.log("[AppShell] All the classes used in the app:", classes);
        }, 2000);
        // Auto section view tracking (browser only)
        this.setupReadDepthTracking();
        this.setupSectionViewTracking();
      });
    } catch {
      // no-op for SSR
    }
    afterEveryRender(() => {
      const waitForIt = (i: number) => {
        setTimeout(() => {
          // console.log("intent ", i)
          this._ank.cssCreate();
          if (i > 0) {
            waitForIt(i - 1);
          }
        }, this._ank.timeBetweenReCreate + 150)
      }
      waitForIt(1);
    }
    );

    // effect() must run within injection context (constructor is OK)
    effect(() => {
      // Reactive SEO/meta updates on language changes
      const lang = this._lang.currentLanguage();
      const draftSeo = this.draftSeo();
      try {
        if (typeof document !== "undefined") {
          // Keep <html lang> in sync with current language for screen readers/UA
          document.documentElement.setAttribute("lang", lang);
          // LTR languages by default (es/en); adjust if RTL added in future
          document.documentElement.setAttribute("dir", "ltr");
          const isEs = lang === 'es';
          const draftTitle = typeof draftSeo?.title === 'string' && draftSeo.title.trim().length > 0
            ? draftSeo.title
            : undefined;
          const draftDescription = typeof draftSeo?.description === 'string' && draftSeo.description.trim().length > 0
            ? draftSeo.description
            : undefined;
          const seoTitle = draftTitle || (isEs
            ? 'Landing Page Optimizada: Convierte visitas en clientes | ZoolandingPage'
            : 'Optimized Landing Page: Turn visits into customers | ZoolandingPage');
          const seoDesc = draftDescription || (isEs
            ? 'Publica una landing rápida, clara y medible. Más cierres de venta, mejores decisiones con datos. Suscripción desde 900 MXN/mes (incluye dominio, alojamiento y medición).'
            : 'Launch a fast, clear and measurable landing. More conversions, better decisions with data. Plans from 900 MXN/month (domain, hosting and analytics included).');

          this.titleSvc.setTitle(seoTitle);
          this.meta.updateTag({ name: 'description', content: seoDesc });

          // Open Graph
          const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : 'https://zoolandingpage.com';
          const url = origin + '/';
          const ogLocale = isEs ? 'es_ES' : 'en_US';
          const ogImage = origin + '/assets/og-1200x630.svg';
          const og = draftSeo?.openGraph ?? {};
          this.meta.updateTag({ property: 'og:title', content: String(og['title'] ?? seoTitle) });
          this.meta.updateTag({ property: 'og:description', content: String(og['description'] ?? seoDesc) });
          this.meta.updateTag({ property: 'og:type', content: String(og['type'] ?? 'website') });
          this.meta.updateTag({ property: 'og:url', content: String(og['url'] ?? url) });
          this.meta.updateTag({ property: 'og:image', content: String(og['image'] ?? ogImage) });
          this.meta.updateTag({ property: 'og:locale', content: String(og['locale'] ?? ogLocale) });
          this.meta.updateTag({ property: 'og:site_name', content: String(og['site_name'] ?? 'Zoo Landing Page') });

          // Twitter Card
          const tw = draftSeo?.twitter ?? {};
          this.meta.updateTag({ name: 'twitter:card', content: String(tw['card'] ?? 'summary_large_image') });
          this.meta.updateTag({ name: 'twitter:title', content: String(tw['title'] ?? seoTitle) });
          this.meta.updateTag({ name: 'twitter:description', content: String(tw['description'] ?? seoDesc) });
          this.meta.updateTag({ name: 'twitter:image', content: String(tw['image'] ?? ogImage) });

          // Canonical link
          const head = this.doc.head;
          if (head) {
            let linkEl = head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
            if (!linkEl) {
              linkEl = this.doc.createElement('link');
              linkEl.setAttribute('rel', 'canonical');
              head.appendChild(linkEl);
            }
            linkEl.setAttribute('href', String(draftSeo?.canonical ?? url));
          }
        }
      } catch {
        // no-op for SSR
      }
    });

    this.initDebugOverlay();
  }

  private async applyConfigOverrides(): Promise<void> {
    const pageId = environment.drafts.defaultPageId;
    const boot = await this.configBootstrap.load({ pageId, lang: this._lang.currentLanguage() });
    const domain = boot.domain || environment.drafts.defaultDomain;
    const pageConfig = boot.pageConfig;
    if (pageConfig?.rootIds?.length) {
      this.rootComponentsIds.set(pageConfig.rootIds);
    }
    if (pageConfig?.modalRootIds?.length) {
      this.modalRootIds.set(pageConfig.modalRootIds);
    }

    const componentsPayload = boot.components;
    if (componentsPayload && Object.keys(componentsPayload.components ?? {}).length > 0) {
      this.orchestrator.setExternalComponentsFromPayload(componentsPayload);
    } else if (this.debugMode) {
      const exportPayload = this.orchestrator.exportDraftComponentsPayload(domain, pageId);
      console.log('[Drafts] Components payload export:', exportPayload);
    }

    this.combosService.applyPayload(boot.combos);

    if (boot.seo) this.draftSeo.set(boot.seo);
    if (boot.analytics) {
      this.draftAnalytics.set(boot.analytics);
      if (boot.analytics.sectionIds?.length) this.sectionViewIds.set(boot.analytics.sectionIds);
      if (boot.analytics.scrollMilestones?.length) this.readDepthMilestones.set(boot.analytics.scrollMilestones);
    }
    if (!boot.structuredDataApplied) this.applyDefaultStructuredData();
  }

  private applyDefaultStructuredData(): void {
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
  }


  onNavChange(item: THeaderNavItem): void {
    this.activeHref.set(item.href);
  }

  private initializeAngoraConfiguration(): void {
    if (this.angoraHasBeenInitialized) return;
    this.angoraHasBeenInitialized = true;
    // this._ank.changeSections([]);
    // this._ank.changeDebugOption(true);
    setTimeout(() => {
      this.combosService.setBaseCombos({
        /* Accordion */
        accContainer: [
          'ank-display-flex ank-flexDirection-column ank-gap-0_25rem'
        ],
        accItemContainer: [
          'ank-borderRadius-0_5rem',
        ],
        accItemExpandedContainer: [
          'ank-bg-accentColor'
        ],
        accItemNotExpandedContainer: [
          'ank-bg-secondaryBgColor'
        ],
        accItemButton: [
          'ank-outline-2px__solid__secondaryAccentColor ank-m-8px ank-color-textColor ank-borderRadius-0_25rem ank-border-0 ank-width-100per ank-textAlign-left ank-padding-0_75rem ank-fontWeight-600 ank-transition-all ank-bgHover-secondaryAccentColor ank-colorHover-titleColor ank-cursor-pointer ank-display-flex ank-justifyContent-spaceMINbetween ank-alignItems-center ank-w-calcSD100per__MIN__16pxED'
        ],
        accItemButtonIsExpanded: [
          'ank-bg-secondaryAccentColor'
        ],
        accItemButtonIsNotExpanded: [
          'ank-bg-transparent'
        ],
        accItemButtonIcon: [
          'ank-transition-transform ank-transformOrigin-center ank-fontSize-1_25rem ank-color-textColor'
        ],
        accItemButtonIconIsExpanded: [
          'ank-transform-rotateSD180degED'
        ],
        accItemButtonIconIsNotExpanded: [
          ''
        ],
        accItemPanel: [
          'ank-overflow-hidden ank-paddingInline-0_75rem ank-paddingBlock-0_5rem ank-color-textColor'
        ],
        /* Button */
        btnBase: [
          "ank-px-VAL1DEF1_5remDEF",
          "ank-py-VAL2DEF0_75remDEF",
          "ank-borderRadius-VAL3DEF0_5remDEF",
          "ank-fontWeight-VAL4DEF550DEF",
          "ank-transformHover-translateYSDVAL5DEFMIN1pxDEFED",
          "ank-gap-VAL6DEF0_5remDEF",
          "ank-justifyContent-VAL7DEFcenterDEF",
          "ank-outlineColor-VAL8DEFtransparentDEF",
          "ank-fs-VAL9DEF1_5remDEF",
          "ank-d-flex",
          "ank-alignItems-center",
          "ank-textDecoration-none",
          "ank-transition-all__200ms",
          "ank-position-relative",
        ],
        btnTypePrimary: [
          "ank-bg-VAL1DEFbgColorDEF",
          "ank-color-VAL2DEFtextColorDEF",
          "ank-border-VAL3DEF2pxDEF__VAL4DEFsolidDEF__VAL1DEFnoneDEF",
        ],
        btnTypeOutline: [
          "ank-border-2px__solid__VAL1DEFbgColorDEF ank-color-VAL1DEFbgColorDEF ank-bgHover-VAL1DEFbgColorDEF", "ank-colorHover-VAL2DEFtextColorDEF",
          "ank-bg-transparent",
          "ank-border-VAL3DEF2pxDEF__VAL4DEFsolidDEF__VAL1DEFnoneDEF",
        ],
        btnTypeGhost: [
          "ank-color-VAL1DEFtextColorDEF",
          "ank-bg-transparent ank-opacity-80 ank-opacityHover-100",
        ],
        btnIcon: ["ank-w-1rem ank-h-1rem ank-me-1rem"],
        btnSpinner: [
          "ank-display-inlineBlock ank-width-1rem ank-height-1rem",
          "ank-border-2px ank-borderStyle-solid ank-borderColor-secondaryLinkColor",
          "ank-borderTopColor-transparent ank-borderRadius-99rem",
          "ank-and-1s",
          "ank-antf-linear",
          "ank-anic-infinite",
          "spinAnimation",
        ],
        /* Utility */
        cardHover: [
          "ank-transition-all ank-td-300ms ank-transformHover-translateYSDMIN4pxED ank-boxShadowHover-0__0_5rem__1rem__rgbaSD0COM0COM0COM0_5ED",
        ],
        sectionPadding: ["ank-py-80px ank-px-20px"],
        containerMax: ["ank-maxWidth-1200px ank-mx-auto"],
        gridCol2: [
          "ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-md-repeatSD2COM1frED ank-gridTemplateColumns-lg-repeatSD3COM1frED ank-gap-2rem",
        ],
        textGradient: [
          "ank-bgi-linearMINgradientSDVAL1DEF90degDEFCOMVAL2DEFabyssDEFCOMVAL3DEFwhiteDEFED ank-bgcl-text ank-color-transparent",
        ],
      });
    }, 1000);
  }

  // Debug overlay: keep last 10 analytics events when debug mode is on
  readonly recentEvents = signal<readonly string[]>([]);
  readonly configIssues = computed(() => this.configStore.validationIssues());
  private initDebugOverlay(): void {
    if (!this.debugMode) return;
    try {
      this.events.onEvent().subscribe((evt) => {
        const next = [
          `${ evt.name } | ${ evt.category || "" } | ${ evt.label || "" }`,
        ].concat(this.recentEvents());
        this.recentEvents.set(next.slice(0, 10));
      });
    } catch {
      // ignore overlay errors
    }
  }

  downloadDraftPayloads(): void {
    if (!this.debugMode || typeof document === 'undefined') return;
    const resolved = this.domainResolver.resolveDomain();
    const domain = resolved.domain || environment.drafts.defaultDomain;
    const pageId = environment.drafts.defaultPageId;
    const payloads = this.buildDraftPayloads(domain, pageId);

    payloads.forEach((payload) => {
      const blob = new Blob([JSON.stringify(payload.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.name;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  async writeDraftPayloadsToDisk(): Promise<void> {
    if (!this.debugMode || typeof window === 'undefined') return;
    const picker = (window as any).showDirectoryPicker;
    if (typeof picker !== 'function') {
      this.downloadDraftPayloads();
      return;
    }

    const resolved = this.domainResolver.resolveDomain();
    const domain = resolved.domain || environment.drafts.defaultDomain;
    const pageId = environment.drafts.defaultPageId;
    const payloads = this.buildDraftPayloads(domain, pageId);

    try {
      const dirHandle = await picker();
      for (const payload of payloads) {
        await this.writeFileToDir(dirHandle, payload.name, JSON.stringify(payload.data, null, 2));
      }
    } catch {
      this.downloadDraftPayloads();
    }
  }

  private buildDraftPayloads(domain: string, pageId: string): { name: string; data: unknown }[] {
    const pageConfig = this.configStore.pageConfig() ?? {
      version: 1,
      pageId,
      domain,
      rootIds: this.rootComponentsIds(),
      modalRootIds: this.modalRootIds(),
    };
    const componentsPayload = this.configStore.components() ?? this.orchestrator.exportDraftComponentsPayload(domain, pageId);
    const variables = this.configStore.variables();
    const combos = this.configStore.combos();
    const seo = this.configStore.seo();
    const structured = this.configStore.structuredData();
    const analytics = this.configStore.analytics();
    const i18n = this.configStore.i18n();

    const payloads: { name: string; data: unknown }[] = [
      { name: 'page-config.json', data: pageConfig },
      { name: 'components.json', data: componentsPayload },
    ];

    if (variables) payloads.push({ name: 'variables.json', data: variables });
    if (combos) payloads.push({ name: 'angora-combos.json', data: combos });
    if (seo) payloads.push({ name: 'seo.json', data: seo });
    if (structured) payloads.push({ name: 'structured-data.json', data: structured });
    if (analytics) payloads.push({ name: 'analytics-config.json', data: analytics });
    if (i18n) payloads.push({ name: `i18n/${ i18n.lang }.json`, data: i18n });

    return payloads;
  }

  private async writeFileToDir(dirHandle: any, name: string, contents: string): Promise<void> {
    const parts = name.split('/').filter(Boolean);
    let current = dirHandle;
    while (parts.length > 1) {
      const part = parts.shift() as string;
      current = await current.getDirectoryHandle(part, { create: true });
    }
    const fileName = parts[0];
    const fileHandle = await current.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
  }

  // Unified analytics event handler (receives from any child component)
  handleAnalyticsEvent(evt: AnalyticsEventPayload): void {
    if (!evt?.name) return;
    try {
      if (
        evt.name === AnalyticsEvents.FinalCtaPrimaryClick ||
        evt.name === AnalyticsEvents.FinalCtaSecondaryClick
      ) {
        /* console.log('[AppShell] final-cta analytics received', evt); */
      }
    } catch { }
    forwardAnalyticsEvent(this.analytics, evt);
  }

  // Router outlet activation: wire outputs dynamically when navigated component exposes analyticsEvent Output
  onRouteActivate(instance: any): void {
    // LandingPageComponent emits analyticsEvent using Output; subscribe via monkey patch if needed
    // Since Outputs are event emitters, we detect presence by method emit or subscribe
    try {
      if (instance?.analyticsEvent) {
        // Angular signals output returns an EventEmitter-like object with subscribe
        const emitter = instance.analyticsEvent;
        if (typeof emitter?.subscribe === "function") {
          emitter.subscribe((e: AnalyticsEventPayload) =>
            this.handleAnalyticsEvent(e)
          );
        }
      }
    } catch { }
  }

  removeAnkDNoneFromAnkTimer(): void {
    // Remove ank-d-none from ank-timer elements to avoid FOUC
    try {
      const ankTimer = document.getElementById("ankTimer");
      if (ankTimer) {
        ankTimer.classList.remove("ank-d-none");
      }
    } catch {
      // no-op
    }
  }

  private setupReadDepthTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    // Granular scroll depth milestones (10% increments)
    const milestones = [...this.readDepthMilestones()];
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
          void this.analytics.track(AnalyticsEvents.ScrollDepth, {
            category: AnalyticsCategories.Navigation,
            label: `${ m }%`,
            value: m,
            meta: { depthPercent: m },
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
  private lastSectionViewSuppressedUntil = 0;
  private setupSectionViewTracking(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }
    const ids = [...this.sectionViewIds()];
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
              void this.analytics.track(AnalyticsEvents.SectionView, {
                category: AnalyticsCategories.Navigation,
                label: id,
              });
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
}
