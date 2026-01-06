import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
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
