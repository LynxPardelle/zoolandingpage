import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  ViewChild,
} from '@angular/core';
import {
  composeDomId,
  resolveComponentRootDomId,
  resolveDynamicValue,
} from '../../utility/component-orchestrator.utility';
import type {
  GenericMediaImageDecoding,
  GenericMediaImageFetchPriority,
  GenericMediaImageLoading,
  GenericMediaTag,
  TGenericMediaConfig,
} from './generic-media.types';

@Component({
  selector: 'generic-media',
  standalone: true,
  imports: [],
  templateUrl: './generic-media.html',
  styleUrl: './generic-media.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericMedia implements AfterViewInit {
  readonly config = input.required<TGenericMediaConfig>();
  readonly componentId = input<string | undefined>(undefined);
  @ViewChild('imageElement')
  private imageElement?: ElementRef<HTMLImageElement>;
  private readonly maxImageRetryAttempts = 2;
  private readonly imageRetryState = new WeakMap<
    HTMLImageElement,
    {
      readonly baseSrc: string;
      readonly attempt: number;
    }
  >();

  readonly id = computed(
    () =>
      resolveComponentRootDomId(
        this.config().id,
        this.componentId(),
        'media'
      ) ?? null
  );
  readonly linkContentId = computed(
    () => composeDomId(this.id(), 'content') ?? null
  );
  readonly tag = computed<GenericMediaTag>(() => {
    const resolved = resolveDynamicValue(this.config().tag);
    return (resolved as GenericMediaTag) ?? 'image';
  });
  readonly classes = computed(
    () => this.resolveOptionalString(this.config().classes) ?? ''
  );
  readonly src = computed(() => this.resolveRequiredString(this.config().src));
  readonly alt = computed(() => this.resolveOptionalString(this.config().alt));
  readonly linkLabel = computed(() => this.alt() ?? this.src());
  readonly width = computed(() =>
    this.resolvePositiveInteger(this.config().width)
  );
  readonly height = computed(() =>
    this.resolvePositiveInteger(this.config().height)
  );
  readonly loading = computed<GenericMediaImageLoading>(
    () =>
      this.resolveEnum(
        this.config().loading,
        ['eager', 'lazy'] as const,
        'lazy'
      ) ?? 'lazy'
  );
  readonly fetchPriority = computed<GenericMediaImageFetchPriority | null>(() =>
    this.resolveEnum(
      this.config().fetchPriority,
      ['high', 'low', 'auto'] as const,
      null
    )
  );
  readonly decoding = computed<GenericMediaImageDecoding>(
    () =>
      this.resolveEnum(
        this.config().decoding,
        ['async', 'sync', 'auto'] as const,
        'async'
      ) ?? 'async'
  );
  readonly sizes = computed(() =>
    this.resolveOptionalString(this.config().sizes)
  );

  ngAfterViewInit(): void {
    globalThis.setTimeout(() => this.retryHydratedBrokenImage(), 0);
  }

  private resolveRequiredString(value: unknown): string {
    return String(resolveDynamicValue(value as never) ?? '');
  }

  private resolveOptionalString(value: unknown): string | null {
    const resolved = resolveDynamicValue(value as never);
    if (resolved == null || resolved === '') {
      return null;
    }

    return String(resolved);
  }

  private resolvePositiveInteger(value: unknown): string | null {
    const resolved = resolveDynamicValue(value as never);
    const parsed = Number(resolved);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return String(Math.round(parsed));
  }

  private resolveEnum<T extends string>(
    value: unknown,
    allowed: readonly T[],
    fallback: T | null
  ): T | null {
    const resolved = String(resolveDynamicValue(value as never) ?? '')
      .trim()
      .toLowerCase();
    return allowed.includes(resolved as T) ? (resolved as T) : fallback;
  }

  handleImageLoad(event: Event): void {
    const image = this.asImageElement(event.currentTarget);
    if (image) {
      this.imageRetryState.delete(image);
    }
  }

  handleImageError(event: Event): void {
    const image = this.asImageElement(event.currentTarget);
    if (!image) {
      return;
    }

    this.scheduleImageRetry(image);
  }

  private retryHydratedBrokenImage(): void {
    const image = this.asImageElement(this.imageElement?.nativeElement);
    if (!image || this.tag() !== 'image') {
      return;
    }

    if (image.complete && image.naturalWidth === 0) {
      this.scheduleImageRetry(image);
    }
  }

  private scheduleImageRetry(image: HTMLImageElement): void {
    const baseSrc = this.src();
    const state = this.imageRetryState.get(image);
    const currentAttempt = state?.baseSrc === baseSrc ? state.attempt : 0;
    if (!baseSrc || currentAttempt >= this.maxImageRetryAttempts) {
      return;
    }

    const nextAttempt = currentAttempt + 1;
    this.imageRetryState.set(image, { baseSrc, attempt: nextAttempt });
    globalThis.setTimeout(() => {
      if (this.src() !== baseSrc) {
        return;
      }
      image.src = this.withImageRetryParam(baseSrc, nextAttempt);
    }, 250 * nextAttempt);
  }

  private asImageElement(value: unknown): HTMLImageElement | null {
    if (
      typeof HTMLImageElement === 'undefined' ||
      !(value instanceof HTMLImageElement)
    ) {
      return null;
    }

    return value;
  }

  private withImageRetryParam(src: string, attempt: number): string {
    try {
      const url = new URL(src, document.baseURI);
      url.searchParams.set('zlpImageRetry', String(attempt));
      return url.toString();
    } catch {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}zlpImageRetry=${attempt}`;
    }
  }
}
