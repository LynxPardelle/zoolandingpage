import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
// Assuming barrel exports exist for layout components; adjust path if needed
import { AppContainerComponent, AppSectionComponent } from '../../../core/components/layout';

@Component({
  selector: 'roi-note',
  standalone: true,
  imports: [CommonModule, AppSectionComponent, AppContainerComponent, MatIconModule],
  templateUrl: './roi-note.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiNoteComponent {}
