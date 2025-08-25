import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
// Assuming barrel exports exist for layout components; adjust path if needed
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';
import { LandingPageI18nService } from '../landing-page/landing-page-i18n.service';

@Component({
  selector: 'roi-note',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './roi-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiNoteComponent {
  private readonly i18n = inject(LandingPageI18nService);

  // Use centralized ROI note translations
  readonly copy = computed(() => this.i18n.roiNote());
}
