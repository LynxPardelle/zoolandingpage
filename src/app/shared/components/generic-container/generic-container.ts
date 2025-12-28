import { CommonModule } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { GenericContainerComponentTag, TGenericContainerConfig } from './generic-container.types';

@Component({
  selector: 'generic-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-container.html',
  styleUrl: './generic-container.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericContainerComponent {
  readonly config = input<TGenericContainerConfig>({ tag: 'div' });

  readonly tag = computed<GenericContainerComponentTag>(() => this.config().tag ?? 'div');

  readonly id = computed(() => this.config().id ?? null);
  readonly classes = computed(() => this.config().classes ?? '');

  readonly role = computed(() => this.config().role ?? null);
  readonly ariaLabel = computed(() => this.config().ariaLabel ?? null);
  readonly ariaLabelledby = computed(() => this.config().ariaLabelledby ?? null);
  readonly ariaDescribedby = computed(() => this.config().ariaDescribedby ?? null);

  readonly classMap = computed(() => this.config().classMap ?? null);
  readonly styles = computed(() => this.config().styles ?? null);

  readonly components = computed<readonly string[]>(() =>
    (this.config().components ?? []).map((c) => (c ?? '').trim()).filter(Boolean)
  );

  readonly componentTemplates = computed<Readonly<Record<string, TemplateRef<unknown>>>>(
    () => this.config().componentTemplates ?? {}
  );

  readonly hasComponents = computed(() => this.components().length > 0);
  readonly hasContentToken = computed(() => this.components().includes('__content__'));

  // Renderiza solo templates (excluye __content__)
  readonly templateComponentIds = computed(() => this.components().filter((c) => c !== '__content__'));
}
