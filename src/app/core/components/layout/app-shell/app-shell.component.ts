import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { AsyncPipe } from "@angular/common";
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
import { LanguageService } from "../../../services/language.service";
import { ThemeService } from "../../../services/theme.service";
import type { HeaderNavItem } from "../app-header/app-header.types";

@Component({
  selector: "app-root",
  standalone: true,
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
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  readonly debugMode = environment.features.debugMode;
  // App state
  private readonly appTitle = signal<string>(environment.app.name);
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
    afterNextRender(() => {
      // Prompt for analytics consent early if needed
      this.analytics.promptForConsentIfNeeded();
      this.initializeAngoraConfiguration();
      this._ank.cssCreate();
      if (this.debugMode) {
        this.removeAnkDNoneFromAnkTimer();
      }
      setTimeout(() => {
        console.log("[AppShell] The followind components wasn't rendered:", this.orchestrator['componentsToBeRendered']);
        console.log("[AppShell] The followind components was rendered:", this.orchestrator['componentsAlreadyRendered']);
        const classes: string[] = [...this.orchestrator.getAllTheClassesFromComponents(), 'btnBaseVALSVL1_5remVL1remVL'];
        console.log("[AppShell] All the classes used in the app:", classes);
      }, 2000);
    });
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

    // Keep <html lang> in sync with current language for screen readers/UA
    // effect() must run within injection context (constructor is OK)
    effect(() => {
      const lang = this._lang.currentLanguage();
      try {
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("lang", lang);
          // LTR languages by default (es/en); adjust if RTL added in future
          document.documentElement.setAttribute("dir", "ltr");
        }
      } catch {
        // no-op for SSR
      }
    });

    this.initDebugOverlay();
  }


  onNavChange(item: HeaderNavItem): void {
    this.activeHref.set(item.href);
  }

  private initializeAngoraConfiguration(): void {
    if (this.angoraHasBeenInitialized) return;
    this.angoraHasBeenInitialized = true;
    // this._ank.changeSections([]);
    // this._ank.changeDebugOption(true);
    setTimeout(() => {
      this._ank.pushCombos({
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
    // Apply suppression hints
    if (
      evt.label === "suppress_request" &&
      evt.meta?.suppressForMs &&
      evt.meta?.intent
    ) {
      const until = Date.now() + Number(evt.meta.suppressForMs || 0);
      this.analytics.suppress([evt.name], until); // re-use name; SectionView expected
      return; // do not forward suppression pseudo-event itself
    }
    /* console.log('[AppShell] analytics event', evt); */
    this.analytics.track(evt.name, {
      category: evt.category,
      label: evt.label,
      value: evt.value,
      meta: evt.meta,
    });
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
}
