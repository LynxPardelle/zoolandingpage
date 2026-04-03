import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { composeDomId, resolveComponentDomIdBase, resolveComponentRootDomId, resolveDynamicValue } from '../../utility/component-orchestrator.utility';
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
  readonly componentId = input<string | undefined>(undefined);

  readonly tag = computed<GenericTextTag>(() => {
    const resolved = resolveDynamicValue(this.config().tag);
    return (resolved as GenericTextTag) ?? 'p';
  });
  readonly text = computed(() => {
    return resolveDynamicValue(this.config().text) ?? '';
  });
  readonly classes = computed(() => resolveDynamicValue(this.config().classes) ?? '');
  readonly baseId = computed(() => resolveComponentDomIdBase(this.config().id, this.componentId()));
  readonly id = computed(() => resolveComponentRootDomId(this.config().id, this.componentId(), 'text') ?? null);
  readonly contentId = computed(() => composeDomId(this.id() ?? this.baseId(), 'content') ?? null);
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
