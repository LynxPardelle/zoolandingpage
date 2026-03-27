import { RuntimeService } from "@/app/core/services/runtime.service";
import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { AngoraCombosService } from "@/app/shared/services/angora-combos.service";
import { ConfigStoreService } from "@/app/shared/services/config-store.service";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { SeoMetadataService } from "@/app/shared/services/seo-metadata.service";
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  PLATFORM_ID,
  REQUEST,
  afterNextRender,
  effect,
  inject,
} from "@angular/core";
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { DebugWorkspaceComponent } from "../debug-workspace/debug-workspace.component";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    WrapperOrchestrator,
    GenericModalComponent,
    GenericToastComponent,
    DebugWorkspaceComponent,
  ],
  templateUrl: "./app-shell.component.html",
})
export class AppShellComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly zone = inject(NgZone);
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  readonly debugMode = environment.features.debugMode;
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;
  readonly showClientOnlyHosts = this.isBrowser;
  readonly showDebugWorkspace = this.debugMode && this.isBrowser && this.hasDebugWorkspaceEnabled();

  private readonly router = inject(Router);
  readonly analytics = inject(AnalyticsService);
  private readonly _ank = inject(NgxAngoraService);
  private angoraHasBeenInitialized = false;
  private readonly _theme = inject(ThemeService);
  private readonly _lang = inject(LanguageService);
  readonly lang = this._lang;
  private readonly configStore = inject(ConfigStoreService);
  private readonly combosService = inject(AngoraCombosService);
  private readonly seo = inject(SeoMetadataService);
  readonly runtime = inject(RuntimeService);

  readonly rootComponentsIds = this.runtime.rootComponentsIds;
  readonly modalRootIds = this.runtime.modalRootIds;
  private configOverridesReady: Promise<void> = Promise.resolve();
  private cssCreateTimer: number | null = null;
  private cssCreateDueAt: number | null = null;
  private cssMutationObserver: MutationObserver | null = null;
  private navigationRefreshBound = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.analytics.stopPageEngagementTracking();
      if (this.cssCreateTimer !== null) {
        clearTimeout(this.cssCreateTimer);
        this.cssCreateTimer = null;
        this.cssCreateDueAt = null;
      }
      try {
        this.cssMutationObserver?.disconnect();
      } catch {
        // no-op
      }
      this.cssMutationObserver = null;
    });

    if (this.isBrowser) {
      afterNextRender(async () => {
        // Prompt for analytics consent early if needed
        this.analytics.promptForConsentIfNeeded();
        this.initializeAngoraConfiguration();
        this.configOverridesReady = this.runtime.initialize(this._lang.currentLanguage())
          .catch((error) => {
            console.error('[AppShell] Runtime initialization failed after bootstrap.', error);
          });
        await this.configOverridesReady;
        this.scheduleCssCreate();
        this.bindCssMutationRefresh();
        if (this.showDebugWorkspace) {
          this.removeAnkDNoneFromAnkTimer();
        }
        this.analytics.startPageEngagementTracking(this.configStore.analytics());
        this.bindNavigationRefresh();
      });
    }

    effect(() => {
      if (!this.isBrowser) return;

      const rootCount = this.rootComponentsIds().length;
      const modalCount = this.modalRootIds().length;

      if (rootCount === 0 && modalCount === 0) {
        return;
      }

      this.scheduleCssCreate();
    });

    effect(() => {
      this.seo.apply(this._lang.currentLanguage(), this.configStore.seo());
    });
  }

  private initializeAngoraConfiguration(): void {
    if (this.angoraHasBeenInitialized) return;
    this.angoraHasBeenInitialized = true;
    this.combosService.initializeBaseCombos(1000);
  }

  private hasDebugWorkspaceEnabled(): boolean {
    if (!this.isBrowser || !window.location?.search) return false;
    return new URLSearchParams(window.location.search).has('debugWorkspace');
  }

  private scheduleCssCreate(delay = 0): void {
    if (!this.isBrowser) return;

    const normalizedDelay = Math.max(0, delay);
    const dueAt = Date.now() + normalizedDelay;

    if (this.cssCreateTimer !== null && this.cssCreateDueAt !== null && this.cssCreateDueAt <= dueAt) {
      return;
    }

    if (this.cssCreateTimer !== null) {
      clearTimeout(this.cssCreateTimer);
    }

    this.cssCreateDueAt = dueAt;

    this.zone.runOutsideAngular(() => {
      this.cssCreateTimer = window.setTimeout(() => {
        this.cssCreateTimer = null;
        this.cssCreateDueAt = null;
        this._ank.cssCreate();
      }, normalizedDelay);
    });
  }

  private bindNavigationRefresh(): void {
    if (!this.isBrowser || this.navigationRefreshBound) {
      return;
    }

    this.navigationRefreshBound = true;
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((evt) => {
        this.analytics.track(AnalyticsEvents.PageView, {
          category: AnalyticsCategories.Navigation,
          label: evt.urlAfterRedirects,
        });

        void this.runtime.initialize(this._lang.currentLanguage())
          .then(() => {
            this.scheduleCssCreate();
            this.analytics.startPageEngagementTracking(this.configStore.analytics());
          })
          .catch((error) => {
            console.error('[AppShell] Runtime refresh failed after navigation.', error);
          });
      });
  }

  private bindCssMutationRefresh(): void {
    if (!this.isBrowser || this.cssMutationObserver) {
      return;
    }

    const root = this.host.nativeElement;
    this.zone.runOutsideAngular(() => {
      const observer = new MutationObserver((mutations) => {
        if (!this.hasRelevantCssMutation(mutations)) {
          return;
        }

        this.scheduleCssCreate();
      });

      try {
        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class'],
        });
        this.cssMutationObserver = observer;
      } catch {
        observer.disconnect();
      }
    });
  }

  private hasRelevantCssMutation(mutations: readonly MutationRecord[]): boolean {
    return mutations.some((mutation) => {
      if (mutation.type === 'attributes') {
        return mutation.target instanceof HTMLElement;
      }

      return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
    });
  }

  // Unified analytics event handler (receives from any child component)
  handleAnalyticsEvent(evt: AnalyticsEventPayload): void {
    if (!evt?.name) return;
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
}
