import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DEFAULT_SPINNER_SIZE, DEFAULT_SPINNER_VARIANT } from './loading-spinner.constants';
import { LoadingSpinnerSize, LoadingSpinnerVariant } from './loading-spinner.types';
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
})
export class LoadingSpinnerComponent {
  @Input() variant: LoadingSpinnerVariant = DEFAULT_SPINNER_VARIANT;
  @Input() size: LoadingSpinnerSize = DEFAULT_SPINNER_SIZE;
}
