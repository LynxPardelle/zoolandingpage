import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'roi-calculator-section',
  standalone: true,
  imports: [CommonModule],
  template: '<section class="ank-py-24px ank-textAlign-center ank-opacity-60">Obsoleto: usa conversion-calculator-section</section>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiCalculatorSectionComponent {}
