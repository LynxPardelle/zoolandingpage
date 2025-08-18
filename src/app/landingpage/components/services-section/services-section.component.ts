import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';

@Component({
  selector: 'services-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './services-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSectionComponent {
  readonly services =
    input.required<
      readonly {
        readonly icon: string;
        readonly title: string;
        readonly description: string;
        readonly features: readonly string[];
        readonly color: string;
      }[]
    >();
  readonly serviceCta = output<string>();
  onCta(title: string) {
    this.serviceCta.emit(title);
  }
}
