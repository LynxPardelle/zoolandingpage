import { CommonModule } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import type { GenericContainerComponentTag, TGenericContainerConfig } from './generic-container.types';
@Component({
  selector: 'generic-container',
  host: {
    style: 'display: contents;',
  },
  imports: [CommonModule],
  templateUrl: './generic-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericContainerComponent {
  readonly config = input<TGenericContainerConfig>({ tag: 'div' });

  readonly tag = computed<GenericContainerComponentTag>(() => {
    const resolved = resolveDynamicValue(this.config().tag);
    return (resolved as GenericContainerComponentTag) ?? 'div';
  });

  readonly id = computed<string | undefined>(() => this.resolveOptionalString(this.config().id));
  readonly classes = computed<string>(() => this.resolveString(this.config().classes));
  readonly role = computed<string | undefined>(() => this.resolveOptionalString(this.config().role));
  readonly ariaLabel = computed<string | undefined>(() => this.resolveOptionalString(this.config().ariaLabel));
  readonly ariaLabelledby = computed<string | undefined>(() => this.resolveOptionalString(this.config().ariaLabelledby));
  readonly ariaDescribedby = computed<string | undefined>(() => this.resolveOptionalString(this.config().ariaDescribedby));

  readonly classMap = computed(() => this.config().classMap ?? null);
  readonly styles = computed(() => this.config().styles ?? null);

  readonly components = computed<readonly string[]>(() =>
    (this.config().components ?? [])
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

  readonly componentTemplates = computed<Readonly<Record<string, TemplateRef<unknown>>>>(
    () => this.config().componentTemplates ?? {}
  );

  readonly hasComponents = computed(() => this.components().length > 0);
  readonly hasContentToken = computed(() => this.components().includes('__content__'));

  // Render only named templates here. Projected content keeps the __content__ token.
  readonly templateComponentIds = computed(() => this.components().filter((c) => c !== '__content__'));

  private resolveString(value: unknown): string {
    return String(resolveDynamicValue(value as never) ?? '');
  }

  private resolveOptionalString(value: unknown): string | undefined {
    const resolved = this.resolveString(value).trim();
    return resolved.length > 0 ? resolved : undefined;
  }
}
