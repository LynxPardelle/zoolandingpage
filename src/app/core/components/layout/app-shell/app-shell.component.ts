import type { TComponentChild } from "@/app/shared/components/component-children.types";
import type { GenericContainerComponentTag } from "@/app/shared/components/generic-container/generic-container.types";
import type { GenericTextTag } from "@/app/shared/components/generic-text/generic-text.types";
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
  DestroyRef,
  REQUEST,
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
import { toOpenGraphLocale } from '../../../../shared/i18n/locale.utils';
import {
  AnalyticsCategories,
  AnalyticsEventPayload,
  AnalyticsEvents,
} from "../../../../shared/services/analytics.events";
import { AnalyticsService } from "../../../../shared/services/analytics.service";
import { DraftRegistryService, TDraftRegistryEntry } from '../../../../shared/services/draft-registry.service';
import { I18nService } from "../../../../shared/services/i18n.service";
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
  private readonly draftRefreshIntervalMs = 5000;
  private readonly debugWorkspaceRootId = 'debugWorkspaceRoot';
  private readonly debugDraftPanelId = 'debugDraftPanelRoot';
  private readonly debugDiagnosticsPanelId = 'debugDiagnosticsPanelRoot';
  private readonly defaultRootComponentIds = ['skipToMainLink', 'siteHeader', 'landingPage'] as const;
  private readonly defaultModalRootComponentIds = ['modalAnalyticsConsentRoot', 'modalDemoRoot', 'modalTermsRoot', 'modalDataUseRoot'] as const;
  // SEO services
  private readonly doc: Document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleSvc = inject(Title);
  private readonly meta = inject(Meta);
  private readonly structured = inject(StructuredDataService);
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  readonly debugMode = environment.features.debugMode;
  // App state
  readonly appName = environment.app.name;
  readonly appDescription = environment.app.description;

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
  readonly i18n = inject(I18nService);
  private readonly configBootstrap = inject(ConfigBootstrapService);
  private readonly configStore = inject(ConfigStoreService);
  private readonly draftRegistry = inject(DraftRegistryService);
  private readonly domainResolver = inject(DomainResolverService);
  private readonly combosService = inject(AngoraCombosService);
  private readonly request = inject(REQUEST, { optional: true });

  private readonly draftSeo = signal<TSeoPayload | null>(null);
  private readonly draftAnalytics = signal<TAnalyticsConfigPayload | null>(null);
  readonly availableDrafts = signal<readonly TDraftRegistryEntry[]>([]);
  readonly draftRegistryLoading = signal<boolean>(false);
  readonly activeDraftDomain = computed(() => this.domainResolver.resolveDomain().domain || environment.drafts.defaultDomain);
  readonly activeDraftPageId = computed(() => this.resolveDraftPageId());
  readonly selectedDraftKey = computed(() => this.composeDraftKey(this.activeDraftDomain(), this.activeDraftPageId()));
  readonly activeDraftLabel = computed(() => this.formatDraftLabel({
    domain: this.activeDraftDomain(),
    pageId: this.activeDraftPageId(),
  }));
  readonly draftOptions = computed(() => {
    const entries = [...this.availableDrafts()];
    const active = {
      domain: this.activeDraftDomain(),
      pageId: this.activeDraftPageId(),
    };
    const activeKey = this.composeDraftKey(active.domain, active.pageId);
    if (!entries.some((entry) => this.composeDraftKey(entry.domain, entry.pageId) === activeKey)) {
      entries.push(active);
    }

    return entries
      .map((entry) => ({
        ...entry,
        key: this.composeDraftKey(entry.domain, entry.pageId),
        label: this.formatDraftLabel(entry),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  });
  readonly debugDraftPanelComponents = computed<readonly TGenericComponent[]>(() => {
    if (!this.debugMode) {
      return [];
    }

    const draftButtons = this.draftOptions().map((entry, index) => this.createDraftButtonComponent(entry, index));

    return [
      this.createContainerComponent(
        this.debugDraftPanelId,
        'aside',
        'ank-position-fixed ank-bottom-16px ank-left-16px ank-zIndex-1300 ank-display-flex ank-flexDirection-column ank-gap-12px ank-p-16px ank-borderRadius-16px ank-maxWidth-420px ank-color-white ank-bg-bgColorOPA__0_92 ank-border-1px ank-borderColor-textColorOPA__0_12 ank-backdropFilter-blurSD8pxED ank-boxShadow-0__8px__30px__rgbaSD0COM0COM0COM0_24ED',
        [
          this.createTextComponent(
            'debugDraftPanelEyebrow',
            'small',
            () => `${ this.draftOptions().length } draft${ this.draftOptions().length === 1 ? '' : 's' } detected`,
            'ank-display-inlineFlex ank-alignItems-center ank-gap-6px ank-width-fitMINcontent ank-px-10px ank-py-4px ank-borderRadius-24px ank-bg-accentColor ank-color-textColor ank-fontWeight-700 ank-fontSize-11px ank-letterSpacing-0_08em ank-textTransform-uppercase'
          ),
          this.createTextComponent(
            'debugDraftPanelTitle',
            'h3',
            'Draft Workspace',
            'ank-m-0 ank-fontSize-18px ank-lineHeight-1_2'
          ),
          this.createTextComponent(
            'debugDraftPanelDescription',
            'p',
            'Switch the live preview to any detected draft without editing query params manually.',
            'ank-m-0 ank-color-whiteOPA__0_72 ank-fontSize-13px ank-lineHeight-1_4'
          ),
          this.createContainerComponent(
            'debugDraftPanelActiveDraftCard',
            'div',
            'ank-display-flex ank-flexDirection-column ank-gap-4px ank-p-12px ank-borderRadius-12px ank-bg-textColorOPA__0_08 ank-border-1px ank-borderColor-textColorOPA__0_08',
            [
              this.createTextComponent(
                'debugDraftPanelActiveLabel',
                'small',
                'Current preview',
                'ank-m-0 ank-color-whiteOPA__0_56 ank-fontSize-11px ank-textTransform-uppercase ank-letterSpacing-0_08em'
              ),
              this.createTextComponent(
                'debugDraftPanelActiveValue',
                'p',
                () => this.activeDraftLabel(),
                'ank-m-0 ank-fontSize-14px ank-fontWeight-700 ank-lineHeight-1_35'
              ),
            ]
          ),
          this.createContainerComponent(
            'debugDraftPanelDraftButtons',
            'div',
            'ank-display-flex ank-flexWrap-wrap ank-gap-8px',
            draftButtons
          ),
          this.createContainerComponent(
            'debugDraftPanelFooterRow',
            'div',
            'ank-display-flex ank-alignItems-center ank-justifyContent-spaceMINbetween ank-gap-12px ank-flexWrap-wrap',
            [
              this.createTextComponent(
                'debugDraftPanelHint',
                'small',
                () => this.draftRegistryLoading() ? 'Refreshing draft registry...' : 'The list auto-refreshes while debug mode is enabled.',
                'ank-m-0 ank-color-whiteOPA__0_56 ank-fontSize-12px ank-lineHeight-1_4 ank-flex-1'
              ),
              this.createRefreshDraftsButtonComponent(),
            ]
          ),
        ]
      ),
    ];
  });
  readonly debugWorkspaceComponents = computed<readonly TGenericComponent[]>(() => {
    if (!this.debugMode) {
      return [];
    }

    const children: readonly TComponentChild[] = [
      ...this.debugDraftPanelComponents(),
      ...this.orchestrator.devDemoControlsComponents,
      this.createDebugDiagnosticsPanelComponent(),
    ];

    return [
      this.createContainerComponent(
        this.debugWorkspaceRootId,
        'div',
        '',
        children,
      ),
    ];
  });
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

  private resolveDraftPageId(): string {
    const fallback = environment.drafts.defaultPageId;
    if (typeof window === 'undefined' || !window.location?.search) {
      const requestUrl = String(this.request?.url ?? '').trim();
      if (!requestUrl) {
        return fallback;
      }

      try {
        const value = new URL(requestUrl).searchParams.get('draftPageId');
        const next = String(value ?? '').trim();
        return next.length > 0 ? next : fallback;
      } catch {
        return fallback;
      }
    }

    const value = new URLSearchParams(window.location.search).get('draftPageId');
    const next = String(value ?? '').trim();
    return next.length > 0 ? next : fallback;
  }

  draftPreviewUrl(domain: string, pageId: string): string {
    const normalizedDomain = String(domain).trim() || environment.drafts.defaultDomain;
    const normalizedPageId = String(pageId).trim() || environment.drafts.defaultPageId;

    if (typeof window === 'undefined' || !window.location) {
      return `/?draftDomain=${ encodeURIComponent(normalizedDomain) }&draftPageId=${ encodeURIComponent(normalizedPageId) }`;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('draftDomain', normalizedDomain);
    url.searchParams.set('draftPageId', normalizedPageId);
    return `${ url.pathname }${ url.search }${ url.hash }`;
  }

  private composeDraftKey(domain: string, pageId: string): string {
    return `${ String(domain).trim() }::${ String(pageId).trim() }`;
  }

  private parseDraftKey(key: string): TDraftRegistryEntry | null {
    const [domain = '', pageId = ''] = String(key).split('::');
    const normalizedDomain = domain.trim();
    const normalizedPageId = pageId.trim();

    if (!normalizedDomain || !normalizedPageId) {
      return null;
    }

    return {
      domain: normalizedDomain,
      pageId: normalizedPageId,
    };
  }

  private formatDraftLabel(entry: TDraftRegistryEntry): string {
    return `${ entry.domain } / ${ entry.pageId }`;
  }

  private createTextComponent(id: string, tag: GenericTextTag, text: string | (() => string), classes: string): TGenericComponent {
    return {
      id,
      type: 'text',
      config: {
        tag,
        text,
        classes,
      },
    };
  }

  private createTranslatedTextComponent(id: string, tag: GenericTextTag, key: string, classes: string): TGenericComponent {
    return {
      id,
      type: 'text',
      valueInstructions: `set:config.text,i18n,${ key }`,
      config: {
        tag,
        text: '',
        classes,
      },
    };
  }

  private createContainerComponent(id: string, tag: GenericContainerComponentTag, classes: string, children: readonly TComponentChild[]): TGenericComponent {
    return {
      id,
      type: 'container',
      config: {
        tag,
        classes,
        components: children,
      },
    };
  }

  private createButtonComponent(
    id: string,
    label: string | (() => string),
    classes: string | (() => string),
    pressed?: (event: MouseEvent) => void,
    options?: { icon?: string; ariaLabel?: string | (() => string); loading?: boolean | (() => boolean); eventInstructions?: string }
  ): TGenericComponent {
    return {
      id,
      type: 'button',
      eventInstructions: options?.eventInstructions,
      config: {
        type: 'button',
        label,
        classes,
        pressed,
        icon: options?.icon,
        ariaLabel: options?.ariaLabel,
        loading: options?.loading,
      },
    };
  }

  private createTranslatedEventButtonComponent(id: string, key: string, eventInstructions: string, classes: string): TGenericComponent {
    return {
      id,
      type: 'button',
      eventInstructions,
      valueInstructions: `set:config.label,i18n,${ key }`,
      config: {
        type: 'button',
        label: '',
        classes,
      },
    };
  }

  private createDebugListItemComponent(id: string, text: string): TGenericComponent {
    return this.createContainerComponent(id, 'li', '', [
      this.createTextComponent(`${ id }Text`, 'span', text, ''),
    ]);
  }

  private createDebugDiagnosticsPanelComponent(): TGenericComponent {
    const actionButtonClasses = 'ank-mb-0_5rem ank-bg-transparent ank-border-1px__solid__white ank-color-white ank-borderRadius-4px ank-px-0_5rem ank-py-0_25rem ank-cursor-pointer';
    const children: TComponentChild[] = [
      this.createTranslatedEventButtonComponent(
        'debugDownloadDraftPayloadsButton',
        'ui.debugPanel.downloadDraftPayloads',
        'downloadDraftPayloads',
        actionButtonClasses,
      ),
      this.createTranslatedEventButtonComponent(
        'debugWriteDraftsToDiskButton',
        'ui.debugPanel.writeDraftsToDisk',
        'writeDraftsToDisk',
        actionButtonClasses,
      ),
    ];

    if (this.configIssues().length > 0) {
      children.push(
        this.createTranslatedTextComponent(
          'debugConfigIssuesTitle',
          'p',
          'ui.debugPanel.configIssues',
          'ank-fontWeight-600 ank-mb-0_25rem',
        ),
        this.createContainerComponent(
          'debugConfigIssuesList',
          'ul',
          'ank-m-0 ank-pl-1rem ank-mb-0_5rem',
          this.configIssues().map((issue, index) => this.createDebugListItemComponent(`debugConfigIssue${ index }`, issue)),
        ),
      );
    }

    children.push(
      this.createTranslatedTextComponent(
        'debugAnalyticsLatestTitle',
        'p',
        'ui.debugPanel.analyticsLatest',
        'ank-fontWeight-600 ank-mb-0_25rem',
      ),
      this.createContainerComponent(
        'debugAnalyticsEventsList',
        'ul',
        'ank-m-0 ank-pl-1rem',
        this.recentEvents().map((eventLabel, index) => this.createDebugListItemComponent(`debugAnalyticsEvent${ index }`, eventLabel)),
      ),
    );

    return this.createContainerComponent(
      this.debugDiagnosticsPanelId,
      'div',
      'ank-position-md-fixed ank-bottom-6rem ank-right-25vw ank-mx-auto ank-p-0_5rem ank-bg-blackOPA__0_6 ank-color-white ank-fs-12px ank-borderRadius-6px ank-maxWidth-360px ank-maxHeight-40vh ank-overflow-auto ank-zIndex-1200',
      children,
    );
  }

  private draftButtonClasses(entryKey: string): string {
    const isActive = this.selectedDraftKey() === entryKey;
    const base = 'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-gap-6px ank-minHeight-40px ank-px-12px ank-py-8px ank-borderRadius-12px ank-border-1px ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3 ank-transition-all ank-td-200ms';

    if (isActive) {
      return `${ base } ank-bg-accentColor ank-color-textColor ank-borderColor-accentColor ank-boxShadow-0__6px__18px__rgbaSD0COM123COM255COM0_22ED`;
    }

    return `${ base } ank-bg-transparent ank-color-white ank-borderColor-textColorOPA__0_2 ank-hover-bg-textColorOPA__0_08`;
  }

  private createDraftButtonComponent(entry: { key: string; label: string }, index: number): TGenericComponent {
    return this.createButtonComponent(
      `debugDraftButton${ index }`,
      entry.label,
      () => this.draftButtonClasses(entry.key),
      () => this.selectDraftByKey(entry.key),
      {
        ariaLabel: () => `Open draft ${ entry.label }`,
      }
    );
  }

  private createRefreshDraftsButtonComponent(): TGenericComponent {
    return this.createButtonComponent(
      'debugDraftRefreshButton',
      () => this.draftRegistryLoading() ? 'Refreshing' : 'Refresh',
      'ank-display-inlineFlex ank-alignItems-center ank-justifyContent-center ank-gap-6px ank-minHeight-40px ank-px-14px ank-py-8px ank-borderRadius-12px ank-border-1px ank-borderColor-textColorOPA__0_14 ank-bg-secondaryAccentColor ank-color-textColor ank-fontSize-12px ank-fontWeight-700 ank-lineHeight-1_3 ank-transition-all ank-td-200ms',
      () => this.refreshDraftRegistry(),
      {
        icon: 'refresh',
        ariaLabel: 'Refresh available drafts',
        loading: () => this.draftRegistryLoading(),
      }
    );
  }

  refreshDraftRegistry(): void {
    if (!this.debugMode || typeof window === 'undefined') return;

    this.draftRegistryLoading.set(true);
    this.draftRegistry.listDrafts().subscribe({
      next: (entries: readonly TDraftRegistryEntry[]) => {
        this.availableDrafts.set(entries);
        this.draftRegistryLoading.set(false);
      },
      error: () => {
        this.draftRegistryLoading.set(false);
      },
    });
  }

  selectDraftByKey(key: string): void {
    const selected = this.parseDraftKey(key);
    if (!selected) return;

    const nextUrl = this.draftPreviewUrl(selected.domain, selected.pageId);
    if (typeof window === 'undefined') return;
    if (nextUrl === `${ window.location.pathname }${ window.location.search }${ window.location.hash }`) return;
    window.location.assign(nextUrl);
  }

  private initDraftRegistry(): void {
    if (!this.debugMode || typeof window === 'undefined') return;

    this.refreshDraftRegistry();
    const timerId = window.setInterval(() => this.refreshDraftRegistry(), this.draftRefreshIntervalMs);
    this.destroyRef.onDestroy(() => window.clearInterval(timerId));
  }

  readonly rootComponentsIds = signal<readonly (string | TGenericComponent)[]>([]);

  readonly modalRootIds = signal<readonly string[]>([]);
  private configOverridesReady: Promise<void> = Promise.resolve();

  constructor() {
    this.configOverridesReady = this.applyConfigOverrides();

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
        await this.configOverridesReady;
        this._ank.cssCreate();
        if (this.debugMode) {
          this.removeAnkDNoneFromAnkTimer();
        }
        if (this.debugMode) {
          setTimeout(() => {
            const classes: string[] = [...this.orchestrator.getAllTheClassesFromComponents(), 'btnBaseVALSVL1_25remVL0_75remVL'];
            console.log("[AppShell] All the classes used in the app:", classes);
          }, 2000);
        }
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
          const draftTitle = typeof draftSeo?.title === 'string' && draftSeo.title.trim().length > 0
            ? draftSeo.title
            : undefined;
          const draftDescription = typeof draftSeo?.description === 'string' && draftSeo.description.trim().length > 0
            ? draftSeo.description
            : undefined;
          const seoTitle = draftTitle || this.appName;
          const seoDesc = draftDescription || this.appDescription;

          this.titleSvc.setTitle(seoTitle);
          this.meta.updateTag({ name: 'description', content: seoDesc });

          // Open Graph
          const origin = (typeof location !== 'undefined' && location.origin)
            ? location.origin
            : this.defaultOrigin();
          const url = origin + '/';
          const ogLocale = toOpenGraphLocale(lang) || 'en_US';
          const ogImage = origin + '/assets/og-1200x630.svg';
          const og = draftSeo?.openGraph ?? {};
          this.meta.updateTag({ property: 'og:title', content: String(og['title'] ?? seoTitle) });
          this.meta.updateTag({ property: 'og:description', content: String(og['description'] ?? seoDesc) });
          this.meta.updateTag({ property: 'og:type', content: String(og['type'] ?? 'website') });
          this.meta.updateTag({ property: 'og:url', content: String(og['url'] ?? url) });
          this.meta.updateTag({ property: 'og:image', content: String(og['image'] ?? ogImage) });
          this.meta.updateTag({ property: 'og:locale', content: String(og['locale'] ?? ogLocale) });
          this.meta.updateTag({ property: 'og:site_name', content: String(og['site_name'] ?? this.appName) });

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
    this.initDraftRegistry();
  }

  private async applyConfigOverrides(): Promise<void> {
    const pageId = this.resolveDraftPageId();
    const boot = await this.configBootstrap.load({
      pageId,
      lang: typeof window !== 'undefined' ? this._lang.currentLanguage() : undefined,
    });
    const domain = boot.domain || environment.drafts.defaultDomain;
    const pageConfig = boot.pageConfig;
    const componentsPayload = boot.components;
    const hasRenderableComponents = !!componentsPayload && Object.keys(componentsPayload.components ?? {}).length > 0;
    const rootIds = pageConfig?.rootIds ?? [];
    const modalRootIds = pageConfig?.modalRootIds ?? [];

    if (!hasRenderableComponents || rootIds.length === 0) {
      this.clearRenderedDraft(domain, pageId);
      if (this.debugMode) {
        console.error('[Drafts] Draft render aborted because page-config or components payload is invalid.', {
          domain,
          pageId,
          hasRenderableComponents,
          rootIds,
        });
      }
      return;
    }

    this.orchestrator.setExternalComponentsFromPayload(componentsPayload);
    this.rootComponentsIds.set(rootIds);
    this.modalRootIds.set(modalRootIds);
    this.orchestrator.setDraftExportContext({ domain, pageId, rootIds, modalRootIds });

    if (this.debugMode) {
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

  private clearRenderedDraft(domain: string, pageId: string): void {
    this.rootComponentsIds.set([]);
    this.modalRootIds.set([]);
    this.orchestrator.setExternalComponentsFromPayload(null);
    this.orchestrator.setDraftExportContext({
      domain,
      pageId,
      rootIds: [],
      modalRootIds: [],
    });
  }

  private applyDefaultStructuredData(): void {
    const origin = this.defaultOrigin();
    this.structured.injectOnce('sd:website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.appName,
      url: `${ origin }/`,
      inLanguage: this.lang.currentLanguage(),
      potentialAction: {
        '@type': 'SearchAction',
        target: `${ origin }/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });
    this.structured.injectOnce('sd:org', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: this.appName,
      url: `${ origin }/`,
      logo: `${ origin }/assets/logo-512x512.svg`,
      sameAs: [
        'https://www.facebook.com/',
        'https://www.instagram.com/',
        'https://www.linkedin.com/'
      ],
    });
  }

  private defaultOrigin(): string {
    const resolved = this.domainResolver.resolveDomain().domain || environment.domain.defaultDomain;
    return `https://${ resolved }`;
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
          "ank-bgi-linearMINgradientSDVAL1DEF90degDEFCOMVAL2DEFsecondaryAccentColorDEFCOMVAL3DEFsecondaryTitleColorDEFED ank-bgcl-text ank-color-transparent",
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
