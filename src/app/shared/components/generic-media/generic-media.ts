import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TGenericMediaConfig } from './generic-media.types';

@Component({
  selector: 'generic-media',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-media.html',
  styleUrl: './generic-media.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericMedia {
  readonly config = input<TGenericMediaConfig>();

  readonly id = computed(() => this.resolveMaybeThunk(this.config()?.id));
  readonly tag = computed(() => this.resolveMaybeThunk(this.config()?.tag));
  readonly classes = computed(() => this.resolveMaybeThunk(this.config()?.classes) ?? '');
  readonly src = computed(() => this.resolveMaybeThunk(this.config()?.src) ?? '');
  readonly alt = computed(() => this.resolveMaybeThunk(this.config()?.alt) ?? '');

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }

}
