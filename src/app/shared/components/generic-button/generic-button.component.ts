import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  GENERIC_BUTTON_BASE,
  GENERIC_BUTTON_ICON_CLASS,
  GENERIC_BUTTON_SIZES,
  GENERIC_BUTTON_SPINNER_CLASS,
  buildVariantClass,
} from './generic-button.constants';
import type { ButtonSize, ButtonVariant } from './generic-button.types';

@Component({
  selector: 'generic-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './generic-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly colorKey = input<string>('secondaryLinkColor');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly icon = input<string | undefined>(undefined);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly pressed = output<MouseEvent>();

  readonly classes = computed(() =>
    [
      GENERIC_BUTTON_BASE,
      buildVariantClass(this.variant(), this.colorKey()),
      GENERIC_BUTTON_SIZES[this.size()],
      this.loading() ? 'ank-cursor-wait ank-opacity-80' : '',
    ].join(' ')
  );

  readonly iconClass = GENERIC_BUTTON_ICON_CLASS;
  readonly spinnerClass = GENERIC_BUTTON_SPINNER_CLASS;

  @HostBinding('class.ank-inlineBlock') hostInline = true;

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  }
}
