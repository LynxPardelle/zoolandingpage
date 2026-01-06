import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';

@Component({
  selector: 'conversion-note',
  imports: [WrapperOrchestrator],
  templateUrl: './conversion-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiNoteComponent {
}
