import { RuntimeService } from "@/app/core/services/runtime.service";
import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { AngoraCombosService } from "@/app/shared/services/angora-combos.service";
import { ConfigStoreService } from "@/app/shared/services/config-store.service";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { SeoMetadataService } from "@/app/shared/services/seo-metadata.service";
import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterEveryRender,
  afterNextRender,
  effect,
  inject,
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
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  readonly debugMode = environment.features.debugMode;

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
  private readonly runtime = inject(RuntimeService);

  readonly rootComponentsIds = this.runtime.rootComponentsIds;
  readonly modalRootIds = this.runtime.modalRootIds;
  private configOverridesReady: Promise<void> = Promise.resolve();

  constructor() {
    this.configOverridesReady = this.runtime.initialize(
      typeof window !== 'undefined' ? this._lang.currentLanguage() : undefined,
    );
    this.destroyRef.onDestroy(() => this.analytics.stopPageEngagementTracking());

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
          setTimeout(() => {
            const classes: string[] = [...this.orchestrator.getAllTheClassesFromComponents()];
            console.log("[AppShell] All the classes used in the app:", classes);
          }, 2000);
        }
        this.analytics.startPageEngagementTracking(this.configStore.analytics());
      });
    } catch {
      // no-op for SSR
    }
    afterEveryRender(() => {
      const waitForIt = (i: number) => {
        setTimeout(() => {
          this._ank.cssCreate();
          if (i > 0) {
            waitForIt(i - 1);
          }
        }, this._ank.timeBetweenReCreate + 150)
      }
      waitForIt(1);
    }
    );

    effect(() => {
      this.seo.apply(this._lang.currentLanguage(), this.configStore.seo());
    });
  }

  private initializeAngoraConfiguration(): void {
    if (this.angoraHasBeenInitialized) return;
    this.angoraHasBeenInitialized = true;
    this.combosService.initializeBaseCombos(1000);
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
