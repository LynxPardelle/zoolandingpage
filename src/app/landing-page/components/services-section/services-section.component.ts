import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppContainerComponent } from '../../../core/components/layout/app-container/app-container.component';
import { AppSectionComponent } from '../../../core/components/layout/app-section/app-section.component';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';

@Component({
  selector: 'services-section',
  standalone: true,
  imports: [AppSectionComponent, AppContainerComponent, WrapperOrchestrator],
  templateUrl: './services-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSectionComponent {
}
