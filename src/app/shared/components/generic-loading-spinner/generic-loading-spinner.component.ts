import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { I18nService } from '../../services/i18n.service';
import { DEFAULT_SPINNER_SIZE, DEFAULT_SPINNER_VARIANT } from './generic-loading-spinner.constants';
import { LoadingSpinnerSize, LoadingSpinnerVariant } from './generic-loading-spinner.types';
@Component({
  selector: 'app-loading-spinner',
  imports: [CommonModule],
  templateUrl: './generic-loading-spinner.component.html',
  styleUrls: ['./generic-loading-spinner.component.scss'],
})
export class GenericLoadingSpinnerComponent {
  readonly i18n = inject(I18nService);
  @Input() variant: LoadingSpinnerVariant = DEFAULT_SPINNER_VARIANT;
  @Input() size: LoadingSpinnerSize = DEFAULT_SPINNER_SIZE;
}
