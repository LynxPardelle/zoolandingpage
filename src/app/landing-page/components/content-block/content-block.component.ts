import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CONTENT_BLOCK_BASE_CLASSES, CONTENT_BLOCK_DEFAULT } from './content-block.constants';
import type { ContentBlockData } from './content-block.types';

@Component({
  selector: 'content-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentBlockComponent {
  readonly data = input<ContentBlockData>(CONTENT_BLOCK_DEFAULT);

  readonly hostClasses = computed(() => {
    const d = this.data();
    const layout = d.layout || 'text-only';
    const base = [...CONTENT_BLOCK_BASE_CLASSES];
    if (layout === 'media-left' || layout === 'media-right') {
      base.push('ank-flexDirection-row');
      if (layout === 'media-right') base.push('ank-flexDirection-row-reverse');
    }
    if (d.className) base.push(d.className);
    return base.join(' ');
  });

  readonly showMedia = computed(() => !!this.data().mediaUrl && this.data().layout !== 'text-only');
}
