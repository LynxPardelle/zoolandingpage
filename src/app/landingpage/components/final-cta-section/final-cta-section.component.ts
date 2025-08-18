import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
  readonly primary = output<void>();
  readonly secondary = output<void>();
}
