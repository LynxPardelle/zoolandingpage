import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';

@Component({
  selector: 'testimonials-section',
  standalone: true,
  imports: [WrapperOrchestrator],
  templateUrl: './testimonials-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsSectionComponent {
}
