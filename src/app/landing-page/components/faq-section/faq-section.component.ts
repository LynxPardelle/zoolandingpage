import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';

@Component({
  selector: 'faq-section',
  standalone: true,
  imports: [WrapperOrchestrator],
  templateUrl: './faq-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSectionComponent {
}
