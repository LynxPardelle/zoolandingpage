import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';

import { TGenericLinkConfig } from './generic-link.types';

@Component({
  selector: 'generic-link',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-link.html',
  styleUrl: './generic-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericLink {
  readonly config = input.required<TGenericLinkConfig>();

  @Output() clicked = new EventEmitter<MouseEvent>();

  text(): string {
    const t = this.config().text;
    if (!t) return '';
    return typeof t === 'function' ? t() : t;
  }

  onClick(event: MouseEvent): void {
    const href = this.config().href || '';
    // For in-page navigation, keep behavior consistent with app-header (smooth scroll handled elsewhere)
    if (href.startsWith('#')) {
      event.preventDefault();
    }
    this.clicked.emit(event);
  }
}
