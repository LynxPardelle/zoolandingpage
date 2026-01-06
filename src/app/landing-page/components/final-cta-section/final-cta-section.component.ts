import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';

@Component({
  selector: 'final-cta-section',
  standalone: true,
  imports: [WrapperOrchestrator],
  templateUrl: './final-cta-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalCtaSectionComponent {
}
