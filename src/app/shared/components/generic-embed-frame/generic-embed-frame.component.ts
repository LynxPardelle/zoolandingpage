import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import type { TGenericEmbedFrameConfig } from './generic-embed-frame.types';

@Component({
  selector: 'generic-embed-frame',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-embed-frame.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericEmbedFrameComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly config = input.required<TGenericEmbedFrameConfig>();

  readonly id = computed(() => this.toOptionalString(this.resolveMaybeThunk(this.config().id)));
  readonly src = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.toStringValue(this.resolveMaybeThunk(this.config().src))));
  readonly title = computed(() => this.toStringValue(this.resolveMaybeThunk(this.config().title)));
  readonly classes = computed(() => {
    const extra = this.toOptionalString(this.resolveMaybeThunk(this.config().classes));
    return ['ank-width-100per ank-border-0', extra].filter(Boolean).join(' ');
  });
  readonly height = computed(() => {
    const raw = this.resolveMaybeThunk(this.config().height);
    return raw == null || raw === '' ? '960' : String(raw);
  });
  readonly loading = computed(() => this.config().loading ?? 'lazy');
  readonly allow = computed(() => this.toOptionalString(this.resolveMaybeThunk(this.config().allow)));
  readonly referrerPolicy = computed(() => this.toOptionalString(this.resolveMaybeThunk(this.config().referrerPolicy)));
  readonly sandbox = computed(() => this.toOptionalString(this.resolveMaybeThunk(this.config().sandbox)));
  readonly allowFullscreen = computed(() => Boolean(this.resolveMaybeThunk(this.config().allowFullscreen) ?? false));

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }

  private toOptionalString(value: unknown): string | null {
    if (value == null || value === '') return null;
    return String(value);
  }

  private toStringValue(value: unknown): string {
    return value == null ? '' : String(value);
  }
}
