import { RuntimeService } from "@/app/core/services/runtime.service";
import { WrapperOrchestrator } from "@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component";
import { ConfigStoreService } from "@/app/shared/services/config-store.service";
import { ConfigurationsOrchestratorService } from "@/app/shared/services/configurations-orchestrator";
import { SeoMetadataService } from "@/app/shared/services/seo-metadata.service";
import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  REQUEST,
  afterNextRender,
  effect,
  inject,
} from "@angular/core";
import { environment } from "../../../../environments/environment";
import { GenericModalComponent } from "../../../shared/components/generic-modal/generic-modal.component";
import { GenericToastComponent } from "../../../shared/components/generic-toast";
import {
  AnalyticsEventPayload
} from "../../../shared/services/analytics.events";
import { AnalyticsService } from "../../../shared/services/analytics.service";
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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly draftRuntime = inject(DraftRuntimeService);
  readonly orchestrator = inject(ConfigurationsOrchestratorService);
  readonly debugMode = environment.features.debugMode;
  private readonly isBrowser = isPlatformBrowser(this.platformId) && !this.request;
  readonly showClientOnlyHosts = this.isBrowser;
  readonly showDebugWorkspace = this.debugMode && this.isBrowser && this.draftRuntime.hasDebugWorkspaceEnabled();
  readonly analytics = inject(AnalyticsService);
  private readonly _lang = inject(LanguageService);
  readonly lang = this._lang;
  private readonly configStore = inject(ConfigStoreService);
  private readonly seo = inject(SeoMetadataService);
  readonly runtime = inject(RuntimeService);

  readonly rootComponentsIds = this.runtime.rootComponentsIds;
  readonly modalRootIds = this.runtime.modalRootIds;

  constructor() {
    afterNextRender(() => {
      this.runtime.connect({
        host: this.host.nativeElement,
        destroyRef: this.destroyRef,
        showDebugWorkspace: this.showDebugWorkspace,
        currentLanguage: () => this._lang.currentLanguage(),
      });
    });

    effect(() => {
      this.seo.apply(this._lang.currentLanguage(), this.configStore.seo());
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
}
