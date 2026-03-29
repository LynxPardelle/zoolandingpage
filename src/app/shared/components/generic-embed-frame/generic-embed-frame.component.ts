import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import type { TGenericEmbedFrameConfig } from './generic-embed-frame.types';

type TDynamicValue<TValue> = TValue | (() => TValue);

@Component({
  selector: 'generic-embed-frame',
  standalone: true,
  templateUrl: './generic-embed-frame.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericEmbedFrameComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly config = input.required<TGenericEmbedFrameConfig>();

  readonly id = computed(() => this.optionalString(this.config().id));
  readonly src = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.requiredString(this.config().src)));
  readonly title = computed(() => this.requiredString(this.config().title));
  readonly classes = computed(() => this.optionalString(this.config().classes));
  readonly height = computed(() => this.optionalString(this.config().height));
  readonly loading = computed(() => this.config().loading ?? 'lazy');
  readonly allow = computed(() => this.optionalString(this.config().allow));
  readonly referrerPolicy = computed(() => this.optionalString(this.config().referrerPolicy));
  readonly sandbox = computed(() => this.optionalString(this.config().sandbox));
  readonly allowFullscreen = computed(() => this.resolveDynamicValue(this.config().allowFullscreen) === true);

  private resolveDynamicValue<TValue>(value: TDynamicValue<TValue> | null | undefined): TValue | null {
    if (value == null) return null;
    return typeof value === 'function'
      ? (value as () => TValue)()
      : value;
  }

  private requiredString(value: TDynamicValue<string>): string {
    return String(this.resolveDynamicValue(value) ?? '');
  }

  private optionalString(value: TDynamicValue<unknown> | null | undefined): string | null {
    const resolvedValue = this.resolveDynamicValue(value);
    if (resolvedValue == null || resolvedValue === '') return null;
    return String(resolvedValue);
  }
}
