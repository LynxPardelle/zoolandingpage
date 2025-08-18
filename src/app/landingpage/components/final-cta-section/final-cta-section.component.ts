import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { GenericButtonComponent } from '../../../shared/components/generic-button';
import { FINAL_CTA_DEFAULT } from './final-cta-section.constants';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, GenericButtonComponent],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
  readonly primary = output<void>();
  readonly secondary = output<void>();
  readonly labels = FINAL_CTA_DEFAULT;
}
