import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resolveNavigationTarget } from '../../utility/navigation/navigation-target.utility';

import { TGenericLinkConfig } from './generic-link.types';

@Component({
  selector: 'generic-link',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
    return this.navigationTarget().href;
  }

  routableInternalHref(): boolean {
    const target = this.navigationTarget();
    return target.internal && !target.hashOnly && !!target.path;
  }

  routerLinkPath(): string | undefined {
    return this.routableInternalHref() ? this.navigationTarget().path ?? undefined : undefined;
  }

  routerLinkQueryParams(): Readonly<Record<string, string>> | undefined {
    return this.routableInternalHref() ? this.navigationTarget().queryParams ?? undefined : undefined;
  }

  routerLinkFragment(): string | undefined {
    return this.routableInternalHref() ? this.navigationTarget().fragment ?? undefined : undefined;
  }

  target(): string | null {
    const raw = this.resolveMaybeThunk(this.config().target);
    if (!raw) return null;

    const next = String(raw);
    if (next === '_blank' && this.navigationTarget().internal) {
      return null;
    }

    return next;
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

  private navigationTarget() {
    const resolved = this.resolveMaybeThunk(this.config().href);
    const next = typeof resolved === 'string' ? resolved : String(resolved ?? '');
    return resolveNavigationTarget(next);
  }

  onClick(event: MouseEvent): void {
    const href = this.href();
    if (href.startsWith('#')) {
      event.preventDefault();
    }
    this.clicked.emit(event);
  }
}
