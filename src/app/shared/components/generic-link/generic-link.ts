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
    const t = this.resolveMaybeThunk(this.config().text);
    if (!t) return '';
    return String(t);
  }

  id(): string | null {
    const raw = this.resolveMaybeThunk(this.config().id);
    return raw ? String(raw) : null;
  }

  classes(): string {
    const raw = this.resolveMaybeThunk(this.config().classes);
    return typeof raw === 'string' ? raw : String(raw ?? '');
  }

  ariaLabel(): string | null {
    const raw = this.resolveMaybeThunk(this.config().ariaLabel);
    if (!raw) return null;
    return String(raw);
  }

  href(): string {
    const resolved = this.resolveMaybeThunk(this.config().href);
    return typeof resolved === 'string' ? resolved : String(resolved ?? '');
  }

  target(): string | null {
    const raw = this.resolveMaybeThunk(this.config().target);
    return raw ? String(raw) : null;
  }

  rel(): string {
    const raw = this.resolveMaybeThunk(this.config().rel);
    return raw ? String(raw) : 'nofollow noopener noreferrer';
  }

  componentTokens(): readonly string[] {
    return (this.config().components ?? [])
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private resolveMaybeThunk(value: unknown): unknown {
    if (typeof value === 'function' && (value as (...args: unknown[]) => unknown).length === 0) {
      return (value as () => unknown)();
    }

    return value;
  }

  onClick(event: MouseEvent): void {
    const href = this.href();
    if (href.startsWith('#')) {
      event.preventDefault();
    }
    this.clicked.emit(event);
  }
}
