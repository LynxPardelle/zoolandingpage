import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DRAFT_RUNTIME_STICKY_QUERY_PARAMS } from '../../services/draft-runtime.service';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
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
    const t = resolveDynamicValue(this.config().text);
    if (!t) return '';
    return String(t);
  }

  id(): string | null {
    const raw = resolveDynamicValue(this.config().id);
    return raw ? String(raw) : null;
  }

  classes(): string {
    const raw = resolveDynamicValue(this.config().classes);
    return typeof raw === 'string' ? raw : String(raw ?? '');
  }

  ariaLabel(): string | null {
    const raw = resolveDynamicValue(this.config().ariaLabel);
    if (!raw) return null;
    return String(raw);
  }

  ariaExpanded(): boolean | null {
    const raw = resolveDynamicValue(this.config().ariaExpanded);
    return typeof raw === 'boolean' ? raw : null;
  }

  ariaControls(): string | null {
    const raw = resolveDynamicValue(this.config().ariaControls);
    return raw ? String(raw) : null;
  }

  ariaCurrent(): boolean | 'page' | 'step' | 'location' | 'true' | 'false' | null {
    const raw = resolveDynamicValue(this.config().ariaCurrent);
    return raw == null ? null : raw;
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
    const raw = resolveDynamicValue(this.config().target);
    if (!raw) return null;

    const next = String(raw);
    if (next === '_blank' && this.navigationTarget().internal) {
      return null;
    }

    return next;
  }

  rel(): string {
    const raw = resolveDynamicValue(this.config().rel);
    return raw ? String(raw) : 'nofollow noopener noreferrer';
  }

  componentTokensAttribute(): string | null {
    const joined = this.componentTokens().join(',');
    return joined || null;
  }

  componentTokens(): readonly string[] {
    return (this.config().components ?? [])
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private navigationTarget() {
    const resolved = resolveDynamicValue(this.config().href);
    const next = typeof resolved === 'string' ? resolved : String(resolved ?? '');
    return resolveNavigationTarget(next, {
      stickyQueryParams: DRAFT_RUNTIME_STICKY_QUERY_PARAMS,
    });
  }

  onClick(event: MouseEvent): void {
    const href = this.href();
    if (href.startsWith('#')) {
      event.preventDefault();
    }
    this.clicked.emit(event);
  }
}
