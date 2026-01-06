import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';

@Component({
    selector: 'stats-strip-section',
    standalone: true,
    imports: [WrapperOrchestrator],
    templateUrl: './stats-strip-section.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsStripSectionComponent {
}
