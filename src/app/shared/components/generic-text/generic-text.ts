import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, SecurityContext, TemplateRef } from '@angular/core';
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

  readonly tag = computed<GenericTextTag>(() => this.config().tag ?? 'p');
  readonly text = computed(() => this.config().text ?? '');
  readonly classes = computed(() => this.config().classes ?? '');
  readonly id = computed(() => this.config().id ?? null);
  readonly ariaLabel = computed(() => this.config().ariaLabel ?? null);
  readonly components = computed<readonly string[]>(() => this.config().components ?? []);
  readonly componentTemplates = computed<Readonly<Record<string, TemplateRef<unknown>>>>(
    () => this.config().componentTemplates ?? {}
  );

  readonly safeHtml = computed(() => {
    const html = this.config().html;
    if (!html) return null;
    // Sanitiza HTML (no uses bypassSecurityTrustHtml aquí).
    return this.sanitizer.sanitize(SecurityContext.HTML, html);
  });

  readonly useHtml = computed(() => !!this.safeHtml());
}
