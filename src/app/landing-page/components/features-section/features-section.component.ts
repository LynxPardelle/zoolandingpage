import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AppContainerComponent } from '../../../core/components/layout/app-container/app-container.component';
import { AppSectionComponent } from '../../../core/components/layout/app-section/app-section.component';
import { WrapperOrchestrator } from '../../../shared/components/wrapper-orchestrator/wrapper-orchestrator.component';
import { FeatureItem } from './features-section.types';

@Component({
  selector: 'features-section',
  imports: [AppSectionComponent, AppContainerComponent, WrapperOrchestrator],
  templateUrl: './features-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesSectionComponent {
  @Input()
  config: readonly FeatureItem[] = [];

}
