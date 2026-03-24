import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TGenericIconConfig } from './generic-icon.types';

@Component({
  selector: 'generic-icon',
  imports: [
    MatIconModule,],
  templateUrl: './generic-icon.component.html',
})
export class GenericIconComponent {
  readonly config = input.required<TGenericIconConfig>();

  readonly title = computed(() => this.resolveMaybeThunk(this.config().title) || undefined);
  readonly classes = computed(() => this.resolveMaybeThunk(this.config().classes) || '');
  readonly ariaLabel = computed(() => this.resolveMaybeThunk(this.config().ariaLabel || this.config().title) || null);
  readonly ariaHidden = computed(() => this.resolveMaybeThunk(this.config().ariaHidden) ? 'true' : null);
  readonly iconName = computed(() => String(this.resolveMaybeThunk(this.config().iconName) || ''));

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }
}
