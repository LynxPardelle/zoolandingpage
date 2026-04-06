import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { composeDomId, resolveComponentRootDomId, resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import type { GenericMediaTag, TGenericMediaConfig } from './generic-media.types';

@Component({
  selector: 'generic-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-media.html',
  styleUrl: './generic-media.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericMedia {
  readonly config = input.required<TGenericMediaConfig>();
  readonly componentId = input<string | undefined>(undefined);

  readonly id = computed(() => resolveComponentRootDomId(this.config().id, this.componentId(), 'media') ?? null);
  readonly linkContentId = computed(() => composeDomId(this.id(), 'content') ?? null);
  readonly tag = computed<GenericMediaTag>(() => {
    const resolved = resolveDynamicValue(this.config().tag);
    return (resolved as GenericMediaTag) ?? 'image';
  });
  readonly classes = computed(() => this.resolveOptionalString(this.config().classes) ?? '');
  readonly src = computed(() => this.resolveRequiredString(this.config().src));
  readonly alt = computed(() => this.resolveOptionalString(this.config().alt));
  readonly linkLabel = computed(() => this.alt() ?? this.src());

  private resolveRequiredString(value: unknown): string {
    return String(resolveDynamicValue(value as never) ?? '');
  }

  private resolveOptionalString(value: unknown): string | null {
    const resolved = resolveDynamicValue(value as never);
    if (resolved == null || resolved === '') {
      return null;
    }

    return String(resolved);
  }

}
