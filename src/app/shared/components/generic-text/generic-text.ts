import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  SecurityContext,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  composeDomId,
  resolveComponentDomIdBase,
  resolveComponentRootDomId,
  resolveDynamicValue,
  resolveStyleRecord,
} from '../../utility/component-orchestrator.utility';
import { GenericTextTag, TGenericTextConfig } from './generic-text.types';

type TRenderedGenericTextTag = GenericTextTag | 'div';

const BLOCK_HTML_PATTERN =
  /<(address|article|aside|blockquote|details|div|dl|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|thead|tbody|tfoot|tr|td|th|ul)\b/i;

@Component({
  selector: 'generic-text',
  imports: [CommonModule],
  templateUrl: './generic-text.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './generic-text.scss',
})
export class GenericTextComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly config = input<TGenericTextConfig>({
    tag: 'p',
    text: '',
  });
  readonly componentId = input<string | undefined>(undefined);

  readonly tag = computed<TRenderedGenericTextTag>(() => {
    const resolved = resolveDynamicValue(this.config().tag);
    const configuredTag = (resolved as GenericTextTag | null) ?? 'p';

    if (this.useHtml() && this.containsBlockHtml()) {
      return 'div';
    }

    return configuredTag;
  });
  readonly text = computed(() => {
    return resolveDynamicValue(this.config().text) ?? '';
  });
  readonly classes = computed(
    () => resolveDynamicValue(this.config().classes) ?? ''
  );
  readonly styles = computed(() => resolveStyleRecord(this.config().styles));
  readonly baseId = computed(() =>
    resolveComponentDomIdBase(this.config().id, this.componentId())
  );
  readonly id = computed(
    () =>
      resolveComponentRootDomId(this.config().id, this.componentId(), 'text') ??
      null
  );
  readonly contentId = computed(
    () => composeDomId(this.id() ?? this.baseId(), 'content') ?? null
  );
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

  readonly containsBlockHtml = computed(() =>
    BLOCK_HTML_PATTERN.test(this.safeHtml() ?? '')
  );
}
