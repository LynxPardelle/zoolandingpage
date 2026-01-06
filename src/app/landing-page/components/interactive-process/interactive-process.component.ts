import { WrapperOrchestrator } from '@/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'interactive-process',
  imports: [WrapperOrchestrator],
  templateUrl: './interactive-process.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractiveProcessComponent {
}
