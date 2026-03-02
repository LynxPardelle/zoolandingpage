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

  ariaLabel(): string | null {
    const raw = this.config().ariaLabel;
    if (!raw) return null;
    return typeof raw === 'function' ? raw() : raw;
  }

  href(): string {
    const raw = this.config().href;
    const resolved = typeof raw === 'function' ? raw() : raw;
    return typeof resolved === 'string' ? resolved : String(resolved ?? '');
  }

  onClick(event: MouseEvent): void {
    const href = this.href();
    if (href.startsWith('#')) {
      event.preventDefault();
    }
    this.clicked.emit(event);
  }
}
