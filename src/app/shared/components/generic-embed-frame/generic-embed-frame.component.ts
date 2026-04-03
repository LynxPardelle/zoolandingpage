import type { TDynamicValue } from '@/app/shared/types/component-runtime.types';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { resolveComponentRootDomId, resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import type { TGenericEmbedFrameConfig } from './generic-embed-frame.types';

@Component({
  selector: 'generic-embed-frame',
  standalone: true,
  templateUrl: './generic-embed-frame.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericEmbedFrameComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly config = input.required<TGenericEmbedFrameConfig>();
  readonly componentId = input<string | undefined>(undefined);

  readonly id = computed(() => resolveComponentRootDomId(this.config().id, this.componentId(), 'embed-frame') ?? null);
  readonly src = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.requiredString(this.config().src)));
  readonly title = computed(() => this.requiredString(this.config().title));
  readonly classes = computed(() => this.optionalString(this.config().classes));
  readonly height = computed(() => this.optionalString(this.config().height));
  readonly loading = computed(() => this.config().loading ?? 'lazy');
  readonly allow = computed(() => this.optionalString(this.config().allow));
  readonly referrerPolicy = computed(() => this.optionalString(this.config().referrerPolicy));
  readonly sandbox = computed(() => this.optionalString(this.config().sandbox));
  readonly allowFullscreen = computed(() => resolveDynamicValue(this.config().allowFullscreen) === true);

  private requiredString(value: TDynamicValue<string>): string {
    return String(resolveDynamicValue(value) ?? '');
  }

  private optionalString(value: TDynamicValue<unknown> | null | undefined): string | null {
    const resolvedValue = resolveDynamicValue(value);
    if (resolvedValue == null || resolvedValue === '') return null;
    return String(resolvedValue);
  }
}
