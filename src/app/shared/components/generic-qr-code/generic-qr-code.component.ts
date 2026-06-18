import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { encode } from 'uqr';
import {
  resolveComponentRootDomId,
  resolveDynamicValue,
  resolveStyleRecord,
} from '../../utility/component-orchestrator.utility';
import type {
  TGenericQrCodeConfig,
  TGenericQrCodeErrorCorrectionLevel,
} from './generic-qr-code.types';

const DEFAULT_QR_SIZE = 192;
const DEFAULT_QR_MARGIN = 2;
const MIN_QR_SIZE = 64;
const MAX_QR_SIZE = 1024;
const MIN_QR_MARGIN = 0;
const MAX_QR_MARGIN = 16;
const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

@Component({
  selector: 'generic-qr-code',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-qr-code.component.html',
  styleUrl: './generic-qr-code.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericQrCodeComponent {
  readonly config = input<TGenericQrCodeConfig>({
    value: '',
  });
  readonly componentId = input<string | undefined>(undefined);

  readonly id = computed(
    () =>
      resolveComponentRootDomId(this.config().id, this.componentId(), 'qr-code') ??
      null
  );
  readonly value = computed(() => this.resolveOptionalString(this.config().value));
  readonly ariaLabel = computed(
    () => this.resolveOptionalString(this.config().ariaLabel) ?? 'QR code'
  );
  readonly classes = computed(
    () => this.resolveOptionalString(this.config().classes) ?? ''
  );
  readonly gridClasses = computed(
    () => this.resolveOptionalString(this.config().gridClasses) ?? ''
  );
  readonly moduleClasses = computed(
    () => this.resolveOptionalString(this.config().moduleClasses) ?? ''
  );
  readonly darkModuleClasses = computed(
    () => this.resolveOptionalString(this.config().darkModuleClasses) ?? ''
  );
  readonly lightModuleClasses = computed(
    () => this.resolveOptionalString(this.config().lightModuleClasses) ?? ''
  );
  readonly emptyClasses = computed(
    () => this.resolveOptionalString(this.config().emptyClasses) ?? ''
  );
  readonly errorClasses = computed(
    () => this.resolveOptionalString(this.config().errorClasses) ?? ''
  );
  readonly emptyText = computed(
    () => this.resolveOptionalString(this.config().emptyText) ?? ''
  );
  readonly errorText = computed(
    () => this.resolveOptionalString(this.config().errorText) ?? 'QR code unavailable'
  );
  readonly size = computed(() =>
    this.resolveBoundedInteger(this.config().size, DEFAULT_QR_SIZE, MIN_QR_SIZE, MAX_QR_SIZE)
  );
  readonly margin = computed(() =>
    this.resolveBoundedInteger(this.config().margin, DEFAULT_QR_MARGIN, MIN_QR_MARGIN, MAX_QR_MARGIN)
  );
  readonly errorCorrectionLevel = computed<TGenericQrCodeErrorCorrectionLevel>(() => {
    const resolved = this.resolveOptionalString(this.config().errorCorrectionLevel)?.toUpperCase();
    return ERROR_CORRECTION_LEVELS.includes(resolved as TGenericQrCodeErrorCorrectionLevel)
      ? (resolved as TGenericQrCodeErrorCorrectionLevel)
      : 'M';
  });
  readonly darkColor = computed(
    () => this.resolveOptionalString(this.config().darkColor) ?? '#000000'
  );
  readonly lightColor = computed(
    () => this.resolveOptionalString(this.config().lightColor) ?? '#ffffff'
  );
  readonly styles = computed(() => resolveStyleRecord(this.config().styles));

  readonly encoded = computed(() => {
    const value = this.value();
    if (!value) {
      return null;
    }

    try {
      return encode(value, {
        ecc: this.errorCorrectionLevel(),
        border: this.margin(),
      });
    } catch {
      return null;
    }
  });
  readonly modules = computed(() => this.encoded()?.data ?? []);
  readonly moduleCount = computed(() => this.modules().length);
  readonly gridTemplateColumns = computed(() =>
    this.moduleCount() > 0 ? `repeat(${this.moduleCount()}, minmax(0, 1fr))` : null
  );
  readonly hasRenderError = computed(() => !!this.value() && !this.encoded());
  readonly gridClass = computed(() =>
    ['zlp-qr-code__grid', this.gridClasses()]
      .filter((entry) => entry.trim().length > 0)
      .join(' ')
  );

  moduleClass(isDark: boolean): string {
    return [
      'zlp-qr-code__module',
      this.moduleClasses(),
      isDark ? this.darkModuleClasses() : this.lightModuleClasses(),
    ].filter((entry) => entry.trim().length > 0).join(' ');
  }

  moduleColor(isDark: boolean): string {
    return isDark ? this.darkColor() : this.lightColor();
  }

  private resolveOptionalString(value: unknown): string | null {
    const resolved = resolveDynamicValue(value as never);
    if (resolved == null) {
      return null;
    }

    const normalized = String(resolved).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private resolveBoundedInteger(
    value: unknown,
    fallback: number,
    min: number,
    max: number
  ): number {
    const resolved = Number(resolveDynamicValue(value as never));
    if (!Number.isFinite(resolved)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, Math.round(resolved)));
  }
}
