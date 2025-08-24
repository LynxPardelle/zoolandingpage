import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { FeatureCardComponent } from '../feature-card';

@Component({
  selector: 'features-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, FeatureCardComponent],
  templateUrl: './features-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesSectionComponent {
  readonly features =
    input.required<
      readonly {
        readonly icon: string;
        readonly title: string;
        readonly description: string;
        readonly benefits: readonly string[];
      }[]
    >();
}
