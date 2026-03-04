import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input, input } from '@angular/core';
import { I18nService } from '../../services/i18n.service';

export type ProgressBarMode = 'determinate' | 'indeterminate' | 'buffer' | 'striped';

@Component({
  selector: 'generic-progress-bar',
  imports: [CommonModule],
  templateUrl: './generic-progress-bar.component.html',
  styleUrls: ['./generic-progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericProgressBarComponent {
  private readonly i18n = inject(I18nService);
  readonly value = input<number>(0);
  readonly bufferValue = input<number>(100); // for buffer mode secondary track fill
  readonly mode = input<ProgressBarMode>('determinate');
  readonly valueText = input<string | null>(null); // custom aria-valuetext override
  @Input() color: 'accent' | 'secondary' | 'success' | 'warn' = 'accent';

  // clamp percent
  readonly pct = computed(() => Math.min(100, Math.max(0, this.value() ?? 0)));
  readonly barStyle = computed(() => ({
    width:
      this.mode() === 'determinate' || this.mode() === 'buffer' || this.mode() === 'striped'
        ? this.pct() + '%'
        : undefined,
  }));
  readonly bufferPct = computed(() => Math.min(100, Math.max(0, this.bufferValue() ?? 0)));
  readonly ariaValueText = computed(
    () =>
      this.valueText() ||
      (this.mode() === 'determinate'
        ? this.pct() + '%'
        : this.mode() === 'buffer'
          ? `${ this.i18n.t('ui.common.loading') } ${ this.pct() }% (${ this.bufferPct() }%)`
          : this.mode() === 'striped'
            ? this.pct() + '%'
            : this.i18n.t('ui.common.loading'))
  );
  readonly colorClass = computed(() => {
    switch (this.color) {
      case 'secondary':
        return 'ank-bg-secondaryLinkColor';
      case 'success':
        return 'ank-bg-altSuccessColor';
      case 'warn':
        return 'ank-bg-altWarningColor';
      default:
        return 'ank-bg-accentColor';
    }
  });
}
