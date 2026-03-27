import { AngoraCombosService } from '@/app/shared/services/angora-combos.service';
import { ConfigBootstrapService } from '@/app/shared/services/config-bootstrap.service';
import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { DraftRuntimeService } from '@/app/shared/services/draft-runtime.service';
import { environment } from '@/environments/environment';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RuntimeService {
    private readonly configBootstrap = inject(ConfigBootstrapService);
    private readonly orchestrator = inject(ConfigurationsOrchestratorService);
    private readonly draftRuntime = inject(DraftRuntimeService);
    private readonly combosService = inject(AngoraCombosService);

    readonly rootComponentsIds = signal<readonly string[]>([]);
    readonly modalRootIds = signal<readonly string[]>([]);
    private initializeQueue: Promise<void> = Promise.resolve();

    async initialize(lang?: string): Promise<void> {
        const nextLanguage = lang;
        this.initializeQueue = this.initializeQueue
            .catch(() => undefined)
            .then(() => this.doInitialize(nextLanguage));

        return this.initializeQueue;
    }

    private async doInitialize(lang?: string): Promise<void> {
        const context = await this.draftRuntime.resolveActiveDraftContext();
        const pageId = context.pageId;
        const boot = await this.configBootstrap.load({
            domain: context.domain,
            pageId,
            lang,
        });

        const domain = boot.domain || context.domain || environment.drafts.defaultDomain;
        const pageConfig = boot.pageConfig;
        const componentsPayload = boot.components;
        const hasRenderableComponents = !!componentsPayload && Object.keys(componentsPayload.components ?? {}).length > 0;
        const rootIds = pageConfig?.rootIds ?? [];
        const modalRootIds = pageConfig?.modalRootIds ?? [];

        if (!hasRenderableComponents || rootIds.length === 0) {
            this.clearRenderedDraft(domain, pageId);
            if (environment.features.debugMode) {
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

        this.combosService.applyPayload(boot.combos);
    }

    clearRenderedDraft(domain: string, pageId: string): void {
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
}
