import { RuntimeService } from "@/app/core/services/runtime.service";
import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { ConfigStoreService } from "@/app/shared/services/config-store.service";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { SeoMetadataService } from "@/app/shared/services/seo-metadata.service";
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
  REQUEST,
  runInInjectionContext,
} from "@angular/core";
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
})
export class AppShellComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly draftRuntime = inject(DraftRuntimeService);
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;
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
  readonly runtime = inject(RuntimeService);

  readonly rootComponentsIds = this.runtime.rootComponentsIds;
  readonly modalRootIds = this.runtime.modalRootIds;

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

    effect(() => {
      this.seo.apply(this._lang.currentLanguage(), this.configStore.seo());
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
}
