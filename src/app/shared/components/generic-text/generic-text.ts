import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
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
    const resolved = resolveDynamicValue(this.config().tag);
    return (resolved as GenericTextTag) ?? 'p';
  });
  readonly text = computed(() => {
    return resolveDynamicValue(this.config().text) ?? '';
  });
  readonly classes = computed(() => resolveDynamicValue(this.config().classes) ?? '');
  readonly id = computed(() => resolveDynamicValue(this.config().id) ?? null);
  readonly ariaLabel = computed(() => {
    const raw = resolveDynamicValue(this.config().ariaLabel);
    if (!raw) return null;
    return raw;
  });

  readonly safeHtml = computed(() => {
    const html = resolveDynamicValue(this.config().html);
    if (!html) return null;
    return this.sanitizer.sanitize(SecurityContext.HTML, String(html));
  });

  readonly useHtml = computed(() => !!this.safeHtml());
}
