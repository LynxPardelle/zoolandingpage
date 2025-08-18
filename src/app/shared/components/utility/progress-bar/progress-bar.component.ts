import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, input } from '@angular/core';

export type ProgressBarMode = 'determinate' | 'indeterminate' | 'buffer' | 'striped';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
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
        ? `Loading ${this.pct()}% (buffer ${this.bufferPct()}%)`
        : this.mode() === 'striped'
        ? this.pct() + '%'
        : 'Loading')
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
