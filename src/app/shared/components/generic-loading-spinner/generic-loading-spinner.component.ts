import {
  Component,
  inject,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import {
  DEFAULT_SPINNER_SIZE,
  DEFAULT_SPINNER_VARIANT,
} from './generic-loading-spinner.constants';
import {
  LoadingSpinnerSize,
  LoadingSpinnerVariant,
} from './generic-loading-spinner.types';
@Component({
  selector: 'app-loading-spinner',
  imports: [],
  templateUrl: './generic-loading-spinner.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./generic-loading-spinner.component.scss'],
})
export class GenericLoadingSpinnerComponent {
  readonly i18n = inject(I18nService);
  @Input() variant: LoadingSpinnerVariant = DEFAULT_SPINNER_VARIANT;
  @Input() size: LoadingSpinnerSize = DEFAULT_SPINNER_SIZE;
  @Input() classes = '';

  get resolvedClasses(): string {
    return ['spinner ank-inlineBlock', this.classes].filter((entry) => entry.trim().length > 0).join(' ');
  }
}
