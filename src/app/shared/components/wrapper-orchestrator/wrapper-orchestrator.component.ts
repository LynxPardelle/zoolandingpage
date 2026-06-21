import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  forwardRef,
  inject,
  input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ConfigurationsOrchestratorService } from '../../services/configurations-orchestrator';
import { ValueOrchestrator } from '../../services/value-orchestrator';
import { GenericAccordionComponent } from '../generic-accordion';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GenericCardComponent } from '../generic-card';
import { GenericCellComponent } from '../generic-cell/generic-cell.component';
import { GenericContainerComponent } from '../generic-container/generic-container';
import { GenericDropdown } from '../generic-dropdown';
import { GenericEmbedFrameComponent } from '../generic-embed-frame/generic-embed-frame.component';
import { GenericFileDropzoneComponent } from '../generic-file-dropzone/generic-file-dropzone.component';
import { GenericIconComponent } from '../generic-icon/generic-icon.component';
import { GenericInputComponent } from '../generic-input/generic-input.component';
import { GenericLink } from '../generic-link/generic-link';
import { GenericLoadingSpinnerComponent } from '../generic-loading-spinner';
import { GenericMedia } from '../generic-media/generic-media';
import { GenericPaginationComponent } from '../generic-pagination/generic-pagination.component';
import { GenericQrCodeComponent } from '../generic-qr-code/generic-qr-code.component';
import { GenericRichTextComponent } from '../generic-rich-text/generic-rich-text.component';
import { GenericSearchBoxComponent } from '../generic-search-box/generic-search-box.component';
import type { SearchBoxConfig } from '../generic-search-box/generic-search-box.types';
import { GenericStatsCounterComponent } from '../generic-stats-counter/generic-stats-counter.component';
import { normalizeStatsCounterConfig } from '../generic-stats-counter/generic-stats-counter.constants';
import type { TGenericStatsCounterConfig } from '../generic-stats-counter/generic-stats-counter.types';
import { GenericTabGroupComponent } from '../generic-tab-group/generic-tab-group.component';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { GenericTextComponent } from '../generic-text/generic-text';
import { InteractionScopeComponent } from '../interaction-scope/interaction-scope.component';
import { findInteractionScopeHost } from '../interaction-scope/interaction-scope.service';
import type { TGenericCellColumnConfig } from '../generic-cell/generic-cell.types';

import { ConditionOrchestrator } from '../../services/condition-orchestrator';
import { I18nService } from '../../services/i18n.service';
import {
  resolveComponentRootDomId,
  resolveDynamicValue,
} from '../../utility/component-orchestrator.utility';
import type { TGenericComponent } from './wrapper-orchestrator.types';

@Component({
  selector: 'wrapper-orchestrator',
  standalone: true,
  host: {
    style: 'display: contents;',
  },
  imports: [
    CommonModule,
    GenericAccordionComponent,
    GenericButtonComponent,
    GenericCardComponent,
    GenericCellComponent,
    GenericContainerComponent,
    GenericDropdown,
    GenericEmbedFrameComponent,
    GenericFileDropzoneComponent,
    GenericIconComponent,
    GenericInputComponent,
    forwardRef(() => InteractionScopeComponent),
    GenericLoadingSpinnerComponent,
    GenericSearchBoxComponent,
    GenericTextComponent,
    GenericStatsCounterComponent,
    GenericLink,
    GenericMedia,
    GenericPaginationComponent,
    GenericQrCodeComponent,
    GenericRichTextComponent,
    GenericTabGroupComponent,
    GenericTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './wrapper-orchestrator.component.html',
})
export class WrapperOrchestrator {
  private readonly _configurationsOrchestratorService = inject(
    ConfigurationsOrchestratorService
  );
  private readonly valueOrchestrator = inject(ValueOrchestrator);
  private readonly conditionOrchestrator = inject(ConditionOrchestrator);
  private readonly i18n = inject(I18nService);
  readonly componentsIds = input<readonly string[]>([]);
  readonly hostContext = input<unknown>();

  readonly effectiveHost = computed<unknown>(
    () => this.hostContext() ?? this._configurationsOrchestratorService
  );

  private shouldRender(component: TGenericComponent): boolean {
    const cond = component.condition;
    if (cond === undefined) return true;
    if (typeof cond === 'function') return !!cond();
    if (typeof cond === 'boolean') return cond;
    if (typeof cond === 'string') {
      return this.conditionOrchestrator.evaluate(
        { ...component, condition: cond },
        { host: this.effectiveHost() }
      );
    }
    return true;
  }

  readonly components = computed<TGenericComponent[]>(() => {
    this._configurationsOrchestratorService.componentsRevision();

    return this.componentsIds()
      .map((entry) =>
        this._configurationsOrchestratorService.getComponentById(
          entry,
          this.effectiveHost()
        )
      )
      .filter(
        (c: TGenericComponent | undefined): c is TGenericComponent =>
          c !== undefined
      )
      .map((c: TGenericComponent) =>
        this.valueOrchestrator.apply(c, { host: this.effectiveHost() })
      )
      .filter((c: TGenericComponent) => this.shouldRender(c));
  });

  resolveValue(value: unknown): unknown {
    return resolveDynamicValue(value as never);
  }

  private withResolvedDomId<TConfig>(
    componentId: string,
    componentType: string,
    config: TConfig
  ): TConfig {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return config;
    }

    const rootId = resolveComponentRootDomId(
      (config as Record<string, unknown>)['id'],
      componentId,
      componentType
    );
    if (!rootId) {
      return config;
    }

    if ((config as Record<string, unknown>)['id'] === rootId) {
      return config;
    }

    return {
      ...(config as Record<string, unknown>),
      id: rootId,
    } as TConfig;
  }

  buttonConfig(
    component: Extract<TGenericComponent, { type: 'button' }>
  ): Extract<TGenericComponent, { type: 'button' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  containerConfig(
    component: Extract<TGenericComponent, { type: 'container' }>
  ): Extract<TGenericComponent, { type: 'container' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  embedFrameConfig(
    component: Extract<TGenericComponent, { type: 'embed-frame' }>
  ): Extract<TGenericComponent, { type: 'embed-frame' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  interactionScopeConfig(
    component: Extract<TGenericComponent, { type: 'interaction-scope' }>
  ): Extract<TGenericComponent, { type: 'interaction-scope' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  iconConfig(
    component: Extract<TGenericComponent, { type: 'icon' }>
  ): Extract<TGenericComponent, { type: 'icon' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  linkConfig(
    component: Extract<TGenericComponent, { type: 'link' }>
  ): Extract<TGenericComponent, { type: 'link' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  mediaConfig(
    component: Extract<TGenericComponent, { type: 'media' }>
  ): Extract<TGenericComponent, { type: 'media' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  genericCellConfig(
    component: Extract<TGenericComponent, { type: 'generic-cell' }>
  ): Extract<TGenericComponent, { type: 'generic-cell' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  genericCellColumnConfig(
    component: Extract<TGenericComponent, { type: 'generic-cell' }>
  ): TGenericCellColumnConfig {
    const config = this.genericCellConfig(component);
    return {
      id: String(config.id ?? component.id),
      valuePath: config.valuePath,
      format: config.format,
      emptyText: config.emptyText,
      trueText: config.trueText,
      falseText: config.falseText,
      componentId: config.componentId,
      componentIds: config.componentIds,
      classes: config.classes,
      cellClasses: config.classes,
      valueClasses: config.valueClasses,
    };
  }

  genericFileDropzoneConfig(
    component: Extract<TGenericComponent, { type: 'generic-file-dropzone' }>
  ): Extract<TGenericComponent, { type: 'generic-file-dropzone' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  genericRichTextConfig(
    component: Extract<TGenericComponent, { type: 'generic-rich-text' }>
  ): Extract<TGenericComponent, { type: 'generic-rich-text' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  genericTableConfig(
    component: Extract<TGenericComponent, { type: 'generic-table' }>
  ): Extract<TGenericComponent, { type: 'generic-table' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  paginationConfig(
    component: Extract<TGenericComponent, { type: 'pagination' }>
  ): Extract<TGenericComponent, { type: 'pagination' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  qrCodeConfig(
    component: Extract<TGenericComponent, { type: 'qr-code' }>
  ): Extract<TGenericComponent, { type: 'qr-code' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  loadingSpinnerConfig(
    component: Extract<TGenericComponent, { type: 'loading-spinner' }>
  ): Extract<TGenericComponent, { type: 'loading-spinner' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  textConfig(
    component: Extract<TGenericComponent, { type: 'text' }>
  ): Extract<TGenericComponent, { type: 'text' }>['config'] {
    return this.withResolvedDomId(
      component.id,
      component.type,
      component.config
    );
  }

  resolveSearchConfig(config: unknown): SearchBoxConfig | null {
    const resolved = this.resolveValue(config);
    if (!resolved || typeof resolved !== 'object') {
      return null;
    }

    const suggestions = this.resolveValue(
      (resolved as Record<string, unknown>)['suggestions']
    );
    if (suggestions === (resolved as Record<string, unknown>)['suggestions']) {
      return resolved as SearchBoxConfig;
    }

    return {
      ...(resolved as Record<string, unknown>),
      suggestions,
    } as SearchBoxConfig;
  }

  resolveStatsCounterConfig(config: unknown): TGenericStatsCounterConfig {
    const base = this.resolveValue(config) as
      | Record<string, unknown>
      | undefined;
    if (!base || typeof base !== 'object') {
      return normalizeStatsCounterConfig(undefined);
    }

    return normalizeStatsCounterConfig({
      target: this.resolveValue(base['target']),
      durationMs: this.resolveValue(base['durationMs']),
      startOnVisible: this.resolveValue(base['startOnVisible']),
      ariaLabel: this.resolveValue(base['ariaLabel']),
      min: this.resolveValue(base['min']),
      max: this.resolveValue(base['max']),
      formatMode: this.resolveValue(base['formatMode']),
      formatPrefix: this.resolveValue(base['formatPrefix']),
      formatSuffix: this.resolveValue(base['formatSuffix']),
    } as Partial<TGenericStatsCounterConfig>);
  }

  eventEmitted(event: {
    component: string;
    meta_title?: string;
    eventName: string;
    eventData?: unknown;
    eventInstructions?: string;
  }) {
    const dispatchedEvent = {
      componentId: event.component,
      meta_title: event.meta_title,
      eventName: event.eventName,
      eventData: event.eventData,
      eventInstructions: event.eventInstructions,
    };

    this._configurationsOrchestratorService.handleComponentEvent(
      dispatchedEvent,
      this.effectiveHost()
    );
    findInteractionScopeHost(
      this.effectiveHost()
    )?.autoSubmitInteractionScope?.({
      componentId: dispatchedEvent.componentId,
      eventName: dispatchedEvent.eventName,
      eventData: dispatchedEvent.eventData,
    });
  }

  unknownComponentLabel(type: unknown): string {
    return `${this.i18n.t('ui.debugPanel.unknownComponentPrefix')}: ${String(
      type ?? ''
    )}`;
  }
}
