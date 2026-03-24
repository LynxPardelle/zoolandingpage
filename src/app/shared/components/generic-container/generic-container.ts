import { CommonModule } from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
    const resolved = this.resolveMaybeThunk(this.config().tag);
    return (resolved as GenericContainerComponentTag) ?? 'div';
  });

  readonly id = computed<string | undefined>(() => {
    const resolved = this.resolveMaybeThunk(this.config().id);
    return resolved ? String(resolved) : undefined;
  });
  readonly classes = computed<string>(() => {
    const resolved = this.resolveMaybeThunk(this.config().classes);
    return typeof resolved === 'string' ? resolved : String(resolved ?? '');
  });

  readonly role = computed<string | undefined>(() => {
    const resolved = this.resolveMaybeThunk(this.config().role);
    return resolved ? String(resolved) : undefined;
  });
  readonly ariaLabel = computed(() => {
    const raw = this.resolveMaybeThunk(this.config().ariaLabel);
    if (!raw) return undefined;
    return raw;
  });
  readonly ariaLabelledby = computed(() => this.resolveMaybeThunk(this.config().ariaLabelledby) ?? undefined);
  readonly ariaDescribedby = computed(() => this.resolveMaybeThunk(this.config().ariaDescribedby) ?? undefined);

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

  // Renderiza solo templates (excluye __content__)
  readonly templateComponentIds = computed(() => this.components().filter((c) => c !== '__content__'));

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }
}
