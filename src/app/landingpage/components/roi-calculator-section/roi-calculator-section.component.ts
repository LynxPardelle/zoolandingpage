import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { BusinessSize, CalculatedRoi } from './roi-calculator-section.types';

@Component({
  selector: 'roi-calculator-section',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './roi-calculator-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiCalculatorSectionComponent {
  readonly businessSize = input.required<BusinessSize>();
  readonly industry = input.required<string>();
  readonly visitors = input.required<number>();
  readonly calculatedROI = input.required<CalculatedRoi>();
  readonly businessSizeChange = output<BusinessSize>();
  readonly industryChange = output<string>();
  updateBusinessSize(size: BusinessSize) {
    this.businessSizeChange.emit(size);
  }
  updateIndustry(industry: string) {
    this.industryChange.emit(industry);
  }
}
