import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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

  readonly id = computed(() => this.resolveOptionalString(this.config().id));
  readonly tag = computed<GenericMediaTag>(() => {
    const resolved = this.resolveMaybeThunk(this.config().tag);
    return (resolved as GenericMediaTag) ?? 'image';
  });
  readonly classes = computed(() => this.resolveOptionalString(this.config().classes) ?? '');
  readonly src = computed(() => this.resolveRequiredString(this.config().src));
  readonly alt = computed(() => this.resolveOptionalString(this.config().alt));
  readonly linkLabel = computed(() => this.alt() ?? this.src());

  private resolveRequiredString(value: unknown): string {
    return String(this.resolveMaybeThunk(value) ?? '');
  }

  private resolveOptionalString(value: unknown): string | null {
    const resolved = this.resolveMaybeThunk(value);
    if (resolved == null || resolved === '') {
      return null;
    }

    return String(resolved);
  }

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }

}
