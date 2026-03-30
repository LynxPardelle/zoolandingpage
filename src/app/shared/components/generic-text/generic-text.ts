import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { GenericTextTag, TGenericTextConfig } from './generic-text.types';

@Component({
  selector: 'generic-text',
  imports: [CommonModule],
  templateUrl: './generic-text.html',
  styleUrl: './generic-text.scss'
})
export class GenericTextComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly config = input<TGenericTextConfig>({
    tag: 'p',
    text: '',
  });

  readonly tag = computed<GenericTextTag>(() => {
    const resolved = this.resolveMaybeThunk(this.config().tag);
    return (resolved as GenericTextTag) ?? 'p';
  });
  readonly text = computed(() => {
    return this.resolveMaybeThunk(this.config().text) ?? '';
  });
  readonly classes = computed(() => this.resolveMaybeThunk(this.config().classes) ?? '');
  readonly id = computed(() => this.resolveMaybeThunk(this.config().id) ?? null);
  readonly ariaLabel = computed(() => {
    const raw = this.resolveMaybeThunk(this.config().ariaLabel);
    if (!raw) return null;
    return raw;
  });

  readonly safeHtml = computed(() => {
    const html = this.resolveMaybeThunk(this.config().html);
    if (!html) return null;
    return this.sanitizer.sanitize(SecurityContext.HTML, String(html));
  });

  readonly useHtml = computed(() => !!this.safeHtml());

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }
}
