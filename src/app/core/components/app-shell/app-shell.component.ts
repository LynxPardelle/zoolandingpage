import { RuntimeService } from "@/app/core/services/runtime.service";
import {
  CLIENT_NAVIGATION_END_EVENT,
  CLIENT_NAVIGATION_START_EVENT,
} from "@/app/shared/utility/navigation/browser-navigation.utility";
import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { ConfigStoreService } from "@/app/shared/services/config-store.service";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { SeoMetadataService } from "@/app/shared/services/seo-metadata.service";
import { StructuredDataService } from "@/app/shared/services/structured-data.service";
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  PLATFORM_ID,
  runInInjectionContext,
  signal,
} from "@angular/core";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GenericModalComponent } from "../../../shared/components/generic-modal/generic-modal.component";
import { GenericToastComponent } from "../../../shared/components/generic-toast";
import {
  AnalyticsEventPayload
} from "../../../shared/services/analytics.events";
import { AnalyticsService } from "../../../shared/services/analytics.service";
import { BrowserStateService } from "../../../shared/services/browser-state.service";
import { DraftRuntimeService } from "../../../shared/services/draft-runtime.service";
import { LanguageService } from "../../../shared/services/language.service";
import { forwardAnalyticsEvent } from "../../../shared/utility/forwardAnalyticsEvent.utility";
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
  styles: [`
    .zlp-route-transition {
      position: fixed;
      inset: 0 auto auto 0;
      z-index: 2147483647;
      width: 100%;
      height: 3px;
      overflow: hidden;
      background: transparent;
      pointer-events: none;
    }

    .zlp-route-transition__bar {
      display: block;
      width: 45%;
      height: 100%;
      background: var(--ank-accentColor, #0f948c);
      box-shadow: 0 0 18px color-mix(in srgb, var(--ank-accentColor, #0f948c) 45%, transparent);
      animation: zlp-route-transition 950ms ease-in-out infinite;
    }

    @keyframes zlp-route-transition {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(225%); }
    }

    @media (prefers-reduced-motion: reduce) {
      .zlp-route-transition__bar {
        width: 100%;
        animation: none;
      }
    }
  `],
})
export class AppShellComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly draftRuntime = inject(DraftRuntimeService);
  private readonly router = inject(Router);
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly showClientOnlyHosts = this.isBrowser;
  readonly showDebugWorkspace = computed(() => {
    this.draftRuntime.activeDraftDomain();
    this.draftRuntime.requestedDraftPageId();
    return this.isBrowser && this.draftRuntime.hasDebugWorkspaceEnabled();
  });
  readonly analytics = inject(AnalyticsService);
  private readonly browserState = inject(BrowserStateService);
  private readonly _lang = inject(LanguageService);
  readonly lang = this._lang;
  private readonly configStore = inject(ConfigStoreService);
  private readonly seo = inject(SeoMetadataService);
  private readonly structuredData = inject(StructuredDataService);
  readonly runtime = inject(RuntimeService);
  readonly routeTransitionActive = signal(false);
  private routeTransitionStartedAt = 0;
  private routeTransitionHideTimer: number | null = null;
  private readonly routeTransitionMinimumMs = 320;

  readonly rootComponentsIds = this.runtime.rootComponentsIds;
  readonly modalRootIds = this.runtime.modalRootIds;
  readonly showModalHost = computed(() => (
    this.showClientOnlyHosts
    && !!this.orchestrator.activeModalRef()
  ));

  constructor() {
    afterNextRender(() => {
      this.browserState.connect({
        document: this.host.nativeElement.ownerDocument,
        destroyRef: this.destroyRef,
      });

      this.runtime.connect({
        host: this.host.nativeElement,
        destroyRef: this.destroyRef,
        showDebugWorkspace: () => this.showDebugWorkspace(),
        currentLanguage: () => this._lang.currentLanguage(),
      });
    });

    if (this.isBrowser) {
      const handleClientNavigationStart = () => this.showRouteTransition();
      const handleClientNavigationEnd = () => this.hideRouteTransitionWhenMinimumElapsed();
      window.addEventListener(CLIENT_NAVIGATION_START_EVENT, handleClientNavigationStart);
      window.addEventListener(CLIENT_NAVIGATION_END_EVENT, handleClientNavigationEnd);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener(CLIENT_NAVIGATION_START_EVENT, handleClientNavigationStart);
        window.removeEventListener(CLIENT_NAVIGATION_END_EVENT, handleClientNavigationEnd);
        this.clearRouteTransitionHideTimer();
      });

      this.router.events
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((event) => {
          if (event instanceof NavigationStart) {
            this.showRouteTransition();
            return;
          }

          if (
            event instanceof NavigationEnd
            || event instanceof NavigationCancel
            || event instanceof NavigationError
          ) {
            this.hideRouteTransitionWhenMinimumElapsed();
          }
        });
    }

    effect(() => {
      this.seo.apply(this._lang.currentLanguage(), this.configStore.seo());
    });

    effect(() => {
      this.structuredData.applyEntries(this.configStore.structuredData()?.entries, 'sd:bootstrap');
    });

    effect(() => {
      if (!this.isBrowser) {
        return;
      }

      const hasDynamicRoots = this.rootComponentsIds().length > 0 || this.modalRootIds().length > 0 || this.showDebugWorkspace();
      if (!hasDynamicRoots) {
        return;
      }

      runInInjectionContext(this.injector, () => {
        afterNextRender(() => {
          window.setTimeout(() => {
            this.runtime.requestRenderedComponentsCssUpdate();
          }, 0);
        });
      });
    });
  }

  // Unified analytics event handler (receives from any child component)
  handleAnalyticsEvent(evt: AnalyticsEventPayload): void {
    if (!evt?.name) return;
    forwardAnalyticsEvent(this.analytics, evt);
  }

  onRouteActivate(instance: any): void {
    try {
      if (instance?.analyticsEvent) {
        const emitter = instance.analyticsEvent;
        if (typeof emitter?.subscribe === "function") {
          emitter.subscribe((e: AnalyticsEventPayload) =>
            this.handleAnalyticsEvent(e)
          );
        }
      }
    } catch { }
  }

  private showRouteTransition(): void {
    this.clearRouteTransitionHideTimer();
    this.routeTransitionStartedAt = this.now();
    this.routeTransitionActive.set(true);
  }

  private hideRouteTransitionWhenMinimumElapsed(): void {
    const elapsed = Math.max(0, this.now() - this.routeTransitionStartedAt);
    const remaining = Math.max(0, this.routeTransitionMinimumMs - elapsed);
    this.clearRouteTransitionHideTimer();

    if (remaining === 0) {
      this.routeTransitionActive.set(false);
      return;
    }

    this.routeTransitionHideTimer = window.setTimeout(() => {
      this.routeTransitionHideTimer = null;
      this.routeTransitionActive.set(false);
    }, remaining);
  }

  private clearRouteTransitionHideTimer(): void {
    if (this.routeTransitionHideTimer === null) {
      return;
    }

    window.clearTimeout(this.routeTransitionHideTimer);
    this.routeTransitionHideTimer = null;
  }

  private now(): number {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  }
}
